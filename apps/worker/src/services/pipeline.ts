/** One worker run (ARCHITECTURE.md §6). HTTP client, clock and database are passed in, so it runs on fixtures. */
import { gzipSync } from 'node:zlib';
import type { Source } from '@lk/shared';
import type { HttpClient } from '../http.ts';
import type { SourceResult } from '../sources/base.ts';
import type { Store } from '../store/types.ts';
import type { Clock } from './clock.ts';
import { duplicateLinks } from './duplicates.ts';
import { SourceSync, type SyncCounts } from './sync.ts';

/** What a pipeline needs from an adapter; `SourceAdapter` fits, so does a replay of stored raw pages. */
export interface Fetcher {
  readonly source: Source;
  run(http: HttpClient): Promise<SourceResult>;
}

export interface SourceSummary extends SyncCounts {
  source: Source; complete: boolean; fetched: number; kept: number; skipped: number; invalid: number; error: string | null;
}
export interface RunSummary { runId: number; ok: boolean; problems: string[]; sources: SourceSummary[]; linked: number }

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s[(s.length - 1) >> 1]! + s[s.length >> 1]!) / 2 : 0;
};
const NO_COUNTS: SyncCounts = { new: 0, changed: 0, unchanged: 0, reappeared: 0, removed: 0 };

export class Pipeline {
  constructor(
    private readonly deps: { fetchers: Fetcher[]; http: HttpClient; store: Store; clock: Clock; log?: (msg: string) => void },
  ) {}

  async run(): Promise<RunSummary> {
    const { fetchers, http, store, clock } = this.deps;
    const log = this.deps.log ?? (() => {});
    const runId = await store.runs.open();
    const sync = new SourceSync(store, clock.today());

    // Sources are independent: one failing never stops the others.
    const sources = await Promise.all(fetchers.map(f => this.#source(f, http, sync, runId, log)));

    const problems = sources.flatMap(s => this.#problems(s));
    const linked = await this.#linkDuplicates();
    const ok = problems.length === 0;
    await store.runs.finish(runId, ok);
    return { runId, ok, problems, sources: sources.map(s => s.summary), linked };
  }

  async #source(f: Fetcher, http: HttpClient, sync: SourceSync, runId: number, log: (m: string) => void) {
    const { store, clock } = this.deps;
    const r = await f.run(http);
    const earlier = await store.runs.recentKept(f.source, 7); // before today's row is saved
    let error = r.error;
    let counts = NO_COUNTS;
    let rawPath: string | null = null;
    try {
      if (r.raw.length) {
        rawPath = `${f.source}/${clock.today()}.json.gz`;
        await store.raw.put(rawPath, gzipSync(JSON.stringify(r.raw)));
      }
      counts = await sync.apply(f.source, r.listings, r.complete);
    } catch (e) {
      error = `${error ? `${error}; ` : ''}database: ${e instanceof Error ? e.message : String(e)}`;
    }
    const complete = r.complete && error === null;
    const summary: SourceSummary = {
      ...counts, source: f.source, complete, fetched: r.fetched, kept: r.listings.length,
      skipped: r.skipped, invalid: r.invalid.length, error,
    };
    await store.runs.saveSource({
      runId, source: f.source, complete, fetched: r.fetched, kept: r.listings.length, skipped: r.skipped,
      invalid: r.invalid.length, error, durationMs: r.ms, rawPath,
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

  async #linkDuplicates() {
    const { listings } = this.deps.store;
    const links = duplicateLinks(await listings.loadActive());
    await listings.setSameAs(links);
    return links.length;
  }
}
