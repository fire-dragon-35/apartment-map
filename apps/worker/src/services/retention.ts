/** Raw files are kept 30 days (ARCHITECTURE.md §12), unless a recent source run still points at them. */
import type { Store } from '../store/types.ts';

export const RAW_KEEP_DAYS = 30;

export function daysBefore(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Files are named `<source>/<YYYY-MM-DD>-<sha8>.json.gz`; the day is when the content was first stored. */
const dayOf = (path: string) => path.split('/').pop()!.slice(0, 10);

/**
 * Delete files older than 30 days through the Storage API, except those a source run from the last 30 days points at
 * (an unchanged response keeps pointing at its first file). Runs that pointed at a deleted file lose their `raw_path`.
 */
export async function pruneRaw(store: Store, today: string): Promise<number> {
  const cutoff = daysBefore(today, RAW_KEEP_DAYS);
  const inUse = new Set(await store.runs.rawPathsSince(cutoff));
  const stale = (await store.raw.list()).filter(p => dayOf(p) < cutoff && !inUse.has(p));
  if (!stale.length) return 0;
  await store.raw.remove(stale);        // files first: a failure here leaves raw_path pointing at a file that still exists
  await store.runs.clearRawPaths(stale);
  return stale.length;
}
