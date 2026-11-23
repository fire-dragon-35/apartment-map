/**
 * The files the router needs, cached under apps/worker/cache/ (ARCHITECTURE.md §8, phase 1.5):
 *  - GTFS: Trafiklab "GTFS Regional" for SL. Re-published every night, so it is checked at most once a day with a
 *    conditional request (the key has a small monthly quota); a failed check keeps the cached file.
 *  - OSM: Geofabrik Sweden, cropped with osmium to the grid box plus a margin, downloaded again after 30 days.
 */
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { gridBox } from '@lk/shared';
import { commandExists, run } from './exec.ts';

export interface RouterFiles { gtfs: string; osm: string }

const HOUR = 3_600_000;
const GTFS_CHECK_EVERY = 20 * HOUR;
const OSM_MAX_AGE = 30 * 24 * HOUR;
const OSM_MARGIN_KM = 5;
const OSM_URL = 'https://download.geofabrik.de/europe/sweden-latest.osm.pbf';

export class RouterInputs {
  constructor(private readonly options: { cacheDir: string; gtfsKey: string | undefined; fetch?: typeof fetch; now?: () => number; log?: (m: string) => void }) {}

  private get fetch() { return this.options.fetch ?? fetch; }
  private get now() { return (this.options.now ?? Date.now)(); }
  private log(m: string) { this.options.log?.(`router inputs: ${m}`); }
  private path(...p: string[]) { return [this.options.cacheDir, ...p].join('/'); }

  async ensure(): Promise<RouterFiles> {
    return { gtfs: await this.#gtfs(), osm: await this.#osm() };
  }

  /**
   * The Trafiklab key allows 60 requests per 30 days, so: one round a day (a conditional request for the feed), a retry
   * only after a network error or a 5xx, never after a 4xx (406, 429 and the like); every request carries the gzip
   * header the API insists on. A failed round counts as the day's attempt, so a rerun does not spend more of the quota;
   * the cached feed is used meanwhile.
   */
  async #gtfs(): Promise<string> {
    const file = this.path('gtfs', 'sl.zip'), metaFile = this.path('gtfs', 'meta.json');
    await mkdir(this.path('gtfs'), { recursive: true });
    const have = await exists(file);
    const meta = have ? await readJson<{ etag?: string; checkedAt?: number; attemptedAt?: number }>(metaFile) : {};
    if (have && this.now - Math.max(meta.checkedAt ?? 0, meta.attemptedAt ?? 0) < GTFS_CHECK_EVERY) return file;

    try {
      if (!this.options.gtfsKey) throw new Error('TRAFIKLAB_GTFS_KEY is not set');
      const res = await this.#gtfsRequest(have ? meta.etag : undefined);
      if (res.status === 304) {
        this.log('GTFS unchanged');
      } else {
        await download(res.body!, file);
        this.log('GTFS downloaded');
        meta.etag = res.headers.get('etag') ?? undefined;
      }
      meta.checkedAt = this.now;
    } catch (e) {
      if (!have) throw new Error(`no GTFS and the download failed: ${e instanceof Error ? e.message : String(e)}`);
      this.log(`GTFS check failed, using the cached file (${e instanceof Error ? e.message : String(e)})`);
    }
    meta.attemptedAt = this.now;
    await writeFile(metaFile, JSON.stringify(meta));
    return file;
  }

  /** At most two requests: the first, and one retry after a network error or a 5xx. */
  async #gtfsRequest(etag: string | undefined): Promise<Response> {
    const url = `https://opendata.samtrafiken.se/gtfs/sl/sl.zip?key=${this.options.gtfsKey}`;
    const headers: Record<string, string> = { 'accept-encoding': 'gzip, deflate', ...(etag ? { 'if-none-match': etag } : {}) };
    let last: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 5_000));
      try {
        const res = await this.fetch(url, { headers, signal: AbortSignal.timeout(300_000) });
        if (res.status === 304 || (res.ok && res.body)) return res;
        last = new Error(`HTTP ${res.status}`);
        if (res.status < 500) break;   // a 4xx will not get better by asking again
      } catch (e) {
        last = e;
      }
    }
    throw last;
  }

  async #osm(): Promise<string> {
    const file = this.path('osm', 'stockholm.osm.pbf'), big = this.path('osm', 'sweden-latest.osm.pbf');
    await mkdir(this.path('osm'), { recursive: true });
    if (await exists(file) && this.now - (await stat(file)).mtimeMs < OSM_MAX_AGE) return file;

    try {
      if (!(await exists(big))) {
        this.log('downloading OSM Sweden (large)');
        const res = await this.fetch(OSM_URL, { signal: AbortSignal.timeout(3_600_000) });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        await download(res.body, big);
      }
      await this.#crop(big, file);
      await rm(big, { force: true });   // the cropped file is all that is needed; Sweden is about a gigabyte
      this.log('OSM cropped');
    } catch (e) {
      if (!(await exists(file))) throw new Error(`no OSM extract and building one failed: ${e instanceof Error ? e.message : String(e)}`);
      this.log(`OSM refresh failed, using the old extract (${e instanceof Error ? e.message : String(e)})`);
    }
    return file;
  }

  /** osmium from the PATH, else osmium in a throwaway Debian container (needs Docker, no root on the host). */
  async #crop(src: string, dst: string) {
    const b = gridBox(OSM_MARGIN_KM);
    const bbox = [b.minLon, b.minLat, b.maxLon, b.maxLat].map(n => n.toFixed(4)).join(',');
    const tmp = `${dst}.tmp`;
    if (await commandExists('osmium')) {
      await run('osmium', ['extract', '-b', bbox, '--overwrite', '-o', tmp, '-f', 'pbf', src]);
    } else {
      const dir = this.path('osm'), name = (p: string) => p.split('/').pop()!;
      await run('docker', ['run', '--rm', '-v', `${dir}:/data`, 'debian:stable-slim', 'sh', '-c',
        `apt-get update -qq && apt-get install -y -qq osmium-tool >/dev/null && osmium extract -b ${bbox} --overwrite -f pbf -o /data/${name(tmp)} /data/${name(src)} && chown ${process.getuid!()}:${process.getgid!()} /data/${name(tmp)}`]);
    }
    await rename(tmp, dst);
  }
}

const exists = (p: string) => stat(p).then(() => true, () => false);
const readJson = async <T>(p: string): Promise<T> => JSON.parse(await readFile(p, 'utf8').catch(() => '{}')) as T;

async function download(body: ReadableStream<Uint8Array>, file: string) {
  const tmp = `${file}.part`;
  try {
    await pipeline(Readable.fromWeb(body as never), createWriteStream(tmp));
    await rename(tmp, file);
  } finally {
    await rm(tmp, { force: true });
  }
}
