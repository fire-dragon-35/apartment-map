/** What the "Datakällor" panel says about the scrape (DESIGN.md §4.4). Pure, so it is easy to check. */
export interface SourceStatus {
  source: string;
  started_at: string;
  finished_at: string | null;
  complete: boolean;
  pages: number | null;
  fetched: number;
  skipped: number;
  invalid: number;
  kept: number;
  error: string | null;
  duration_ms: number | null;
  /** median `kept` of the 7 complete runs before this one, and how many runs that was */
  usual_kept: number | null;
  usual_runs: number;
  last_complete_at: string | null;
  active: number;
  /** `kept` of the run behind `last_complete_at` */
  last_complete_kept: number | null;
  /** different listings collected over all runs, removed ones included */
  total_listings: number;
}

export type State = 'ok' | 'incomplete' | 'old';

/** A source whose last complete run is older than this counts as old (the worker runs daily). */
export const STALE_HOURS = 36;

export const SOURCE_INFO: Record<string, { name: string; what: string }> = {
  qasa: { name: 'Qasa', what: 'Qasa och Blocket Bostad · Stockholm, Solna, Sundbyberg, Lidingö, Nacka' },
  homeq: { name: 'HomeQ', what: 'HomeQ · hyresbostäder' },
  bostadsformedlingen: { name: 'Bostadsförmedlingen', what: 'Stockholms Bostadsförmedling' },
  samtrygg: { name: 'Samtrygg', what: 'Samtrygg · hyresbostäder' },
};
export const sourceName = (s: string) => SOURCE_INFO[s]?.name ?? s;

const hoursSince = (iso: string, now: number) => (now - Date.parse(iso)) / 3_600_000;

export function stateOf(s: SourceStatus, now: number): State {
  // a site can be fully fetched while its run died or is still going: that is not a finished collection
  if (!s.complete || s.finished_at === null) return 'incomplete';
  return s.last_complete_at === null || hoursSince(s.last_complete_at, now) > STALE_HOURS ? 'old' : 'ok';
}

/** Few ads: none at all, or under half of the usual count (the worker's own rule; needs 3 earlier runs). */
export function isLow(s: SourceStatus): boolean {
  return s.kept === 0 || (s.usual_runs >= 3 && s.usual_kept !== null && s.kept < s.usual_kept / 2);
}

export function problems(rows: SourceStatus[], now: number): string[] {
  return rows.flatMap(s => {
    const state = stateOf(s, now);
    if (state === 'incomplete') return [`${sourceName(s.source)} ofullständig`];
    if (state === 'old') return [`${sourceName(s.source)} gammal`];
    return isLow(s) ? [`${sourceName(s.source)} få annonser`] : [];
  });
}

const FMT = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const DAY = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit' });

/** "idag 06:34", "igår 06:34" or "24 nov. 06:34", in Stockholm time. */
export function when(iso: string, now: number): string {
  const time = FMT.format(new Date(iso)).split(' ').pop()!;
  const d = DAY.format(new Date(iso));
  if (d === DAY.format(new Date(now))) return `idag ${time}`;
  if (d === DAY.format(new Date(now - 86_400_000))) return `igår ${time}`;
  return FMT.format(new Date(iso));
}

/**
 * The time we show, not the real one: moved 5 to 45 minutes earlier, by a different amount per source, so the page
 * does not give away exactly when or how we fetch. Fixed per source and fetch (same input, same output: no jumping on
 * reload), never later than the real time, so "idag" and the 36 hour rule stay true.
 */
export function shownTime(source: string, iso: string): string {
  let h = 2166136261;
  for (const c of `${source}|${iso}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const minutes = 5 + ((h >>> 0) % 41);
  return new Date(new Date(iso).getTime() - minutes * 60_000).toISOString();
}
