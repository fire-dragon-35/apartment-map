/** One worker run (ARCHITECTURE.md §6). HTTP client, clock and database are passed in, so it runs on fixtures. */
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import type { LatLon, Source, TravelTimeService } from '@lk/shared';
import type { HttpClient } from '../http.ts';
import type { SourceResult } from '../sources/base.ts';
import type { Store } from '../store/types.ts';
import type { Clock } from './clock.ts';
import { duplicateLinks } from './duplicates.ts';
import { pruneRaw } from './retention.ts';
import { SourceSync, type SyncCounts } from './sync.ts';

/** What a pipeline needs from an adapter; `SourceAdapter` fits, so does a replay of stored raw pages. */
export interface Fetcher {
  readonly source: Source;
  run(http: HttpClient): Promise<SourceResult>;
}

export interface SourceSummary extends SyncCounts {
  source: Source; complete: boolean; fetched: number; kept: number; skipped: number; invalid: number; error: string | null;
  /** the raw response was identical to the latest stored one and not uploaded again */
  rawReused: boolean;
}
export interface TravelSummary { computed: number; reused: number; failed: number }
export interface RunSummary {
  runId: number; ok: boolean; problems: string[]; sources: SourceSummary[]; linked: number; rawPruned: number;
  /** null when travel times are not configured or the step failed */
  travel: TravelSummary | null;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s[(s.length - 1) >> 1]! + s[s.length >> 1]!) / 2 : 0;
};
const NO_COUNTS: SyncCounts = { new: 0, changed: 0, unchanged: 0, reappeared: 0, removed: 0 };

export class Pipeline {
  constructor(
    private readonly deps: {
      fetchers: Fetcher[]; http: HttpClient; store: Store; clock: Clock; log?: (msg: string) => void;
      /** Travel times from every active place to this destination (Karlaplan, the free default) */
      travel?: { service: TravelTimeService; destination: LatLon };
    },
  ) {}

  async run(): Promise<RunSummary> {
    const { fetchers, http, store, clock } = this.deps;
    const log = this.deps.log ?? (() => {});
    const runId = await store.runs.open(clock.now());
    const sync = new SourceSync(store, clock.today());

    // Sources are independent: one failing never stops the others.
    const sources = await Promise.all(fetchers.map(f => this.#source(f, http, sync, runId, log)));

    const problems = sources.flatMap(s => this.#problems(s));
    const linked = await this.#linkDuplicates();
    const travel = await this.#travelTimes(log);
    const ok = problems.length === 0;
    await store.runs.finish(runId, ok);
    const rawPruned = await this.#pruneRaw(log);
    return { runId, ok, problems, sources: sources.map(s => s.summary), linked, rawPruned, travel };
  }

  async #source(f: Fetcher, http: HttpClient, sync: SourceSync, runId: number, log: (m: string) => void) {
    const { store, clock } = this.deps;
    const r = await f.run(http);
    const earlier = await store.runs.recentKept(f.source, 7); // before today's row is saved
    let error = r.error;
    let counts = NO_COUNTS;
    let rawPath: string | null = null;
    let rawSha256: string | null = null;
    let rawReused = false;
    try {
      if (r.raw.length) {
        const body = gzipSync(JSON.stringify(r.raw));
        const sha = createHash('sha256').update(body).digest('hex');
        const latest = await store.runs.latestRaw(f.source);
        const reuse = latest?.sha256 === sha;
        const path = reuse ? latest.path : `${f.source}/${clock.today()}-${sha.slice(0, 8)}.json.gz`;
        if (!reuse) await store.raw.put(path, body);
        [rawPath, rawSha256, rawReused] = [path, sha, reuse]; // only once the file is known to exist
      }
      counts = await sync.apply(f.source, r.listings, r.complete);
    } catch (e) {
      error = `${error ? `${error}; ` : ''}database: ${e instanceof Error ? e.message : String(e)}`;
    }
    const complete = r.complete && error === null;
    const summary: SourceSummary = {
      ...counts, source: f.source, complete, fetched: r.fetched, kept: r.listings.length,
      skipped: r.skipped, invalid: r.invalid.length, error, rawReused,
    };
    await store.runs.saveSource({
      runId, source: f.source, complete, fetched: r.fetched, kept: r.listings.length, skipped: r.skipped,
      invalid: r.invalid.length, error, durationMs: r.ms, rawPath, rawSha256,
    });
    log(`${f.source}: ${complete ? 'complete' : `INCOMPLETE ${error}`} fetched ${r.fetched} kept ${r.listings.length} new ${counts.new} changed ${counts.changed} removed ${counts.removed}`);
    return { summary, earlier };
  }

  /** Coverage check (§6 step 7): an incomplete source, zero ads, or under half of the 7 run median is a problem. */
  #problems({ summary: s, earlier }: { summary: SourceSummary; earlier: number[] }): string[] {
    if (!s.complete) return [`${s.source}: incomplete fetch (${s.error})`];
    if (s.kept === 0) return [`${s.source}: returned 0 ads`];
    const m = median(earlier);
    return earlier.length >= 3 && s.kept < m / 2 ? [`${s.source}: ${s.kept} ads, under half of the usual ${m}`] : [];
  }

  /** Travel times for every active place without a fresh row (§6 step 5). A failure here never fails the run. */
  async #travelTimes(log: (m: string) => void): Promise<TravelSummary | null> {
    const { travel, store } = this.deps;
    if (!travel) return null;
    try {
      const { reused, computed, failed } = await travel.service.compute(await store.places.active(), travel.destination);
      log(`travel times: computed ${computed} reused ${reused} failed ${failed.length}`);
      return { computed, reused, failed: failed.length };
    } catch (e) {
      log(`travel times failed (ignored): ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }

  /** A failure here is logged and never fails the run. */
  async #pruneRaw(log: (m: string) => void) {
    try {
      const n = await pruneRaw(this.deps.store, this.deps.clock.today());
      if (n) log(`raw retention: deleted ${n} files older than 30 days`);
      return n;
    } catch (e) {
      log(`raw retention failed (ignored): ${e instanceof Error ? e.message : String(e)}`);
      return 0;
    }
  }

  async #linkDuplicates() {
    const { listings } = this.deps.store;
    const links = duplicateLinks(await listings.loadActive());
    await listings.setSameAs(links);
    return links.length;
  }
}
