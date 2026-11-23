/**
 * TravelTimeService (ARCHITECTURE.md §8, phase 1): minutes and route from places to a destination, cached.
 * Written once; the worker (Node) and the edge function (Deno) both import this file.
 * fetch, clock and cache are passed in. Relative imports only.
 */
import { destinationCell, travelMinutes, walkMinutes } from '../domain/travel.ts';
import type { LatLon } from '../domain/place.ts';
import { ARRIVE_BY, fastestTrip, nextWeekday, tripUrl, type Leg, type Trip } from './sl.ts';

export const DEFAULT_PROFILE = 'weekday_0800';
export const CACHE_DAYS = 7;

export interface PlaceCoord extends LatLon { id: number }

export interface TravelRow {
  placeId: number;
  minutes: number;
  walkMin: number;
  /** null when SL has no trip */
  transitMin: number | null;
  /** null when walking wins */
  legs: Leg[] | null;
}

/** The cache (table travel_times). `fresh` returns only rows computed at or after `since`. */
export interface TravelCache {
  fresh(placeIds: number[], dest: LatLon, profile: string, since: Date): Promise<TravelRow[]>;
  save(rows: TravelRow[], dest: LatLon, profile: string, at: Date): Promise<void>;
}

export interface TravelOptions {
  timeoutMs: number;
  /** extra attempts after the first */
  retries: number;
  /** requests in flight at once */
  concurrency: number;
}

export interface TravelOutcome {
  /** reused and computed rows, in the order of the places asked for */
  results: TravelRow[];
  reused: number;
  computed: number;
  /** skipped, not cached, retried next time */
  failed: number[];
}

const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export class TravelTimeService {
  constructor(
    private readonly deps: { fetch: typeof fetch; cache: TravelCache; now: () => Date },
    private readonly options: TravelOptions = { timeoutMs: 15_000, retries: 2, concurrency: 6 },
  ) {}

  async compute(places: PlaceCoord[], destination: LatLon, profile = DEFAULT_PROFILE): Promise<TravelOutcome> {
    const { cache, now } = this.deps;
    const dest = destinationCell(destination);
    const arriveBy = ARRIVE_BY[profile];
    if (!arriveBy) throw new Error(`unknown profile ${profile}`);

    const since = new Date(now().getTime() - CACHE_DAYS * 86_400_000);
    const rows = new Map<number, TravelRow>();
    for (const ids of chunks(places.map(p => p.id), 200)) {
      for (const r of await cache.fresh(ids, dest, profile, since)) rows.set(r.placeId, r);
    }
    const reused = rows.size;

    const date = nextWeekday(now());
    const fresh: TravelRow[] = [];
    const failed: number[] = [];
    await this.#pool(places.filter(p => !rows.has(p.id)), async place => {
      try {
        const row = await this.#row(place, dest, date, arriveBy);
        fresh.push(row);
        rows.set(place.id, row);
      } catch {
        failed.push(place.id);   // not cached: the next call tries again
      }
    });
    for (const batch of chunks(fresh, 200)) await cache.save(batch, dest, profile, now());

    return { results: places.flatMap(p => rows.get(p.id) ?? []), reused, computed: fresh.length, failed };
  }

  async #row(place: PlaceCoord, dest: LatLon, date: string, arriveBy: string): Promise<TravelRow> {
    const trip = await this.#trip(place, dest, date, arriveBy);
    const walkMin = walkMinutes(place, dest);
    const transitMin = trip?.minutes ?? null;
    const minutes = travelMinutes(walkMin, transitMin);
    return { placeId: place.id, minutes, walkMin, transitMin, legs: trip && minutes === transitMin && walkMin > transitMin ? trip.legs : null };
  }

  /** SL's answer, asked a second time when it holds no trip (an empty answer is sometimes transient). */
  async #trip(place: LatLon, dest: LatLon, date: string, arriveBy: string): Promise<Trip | null> {
    const url = tripUrl(place, dest, date, arriveBy);
    for (let ask = 0; ask < 2; ask++) {
      const trip = fastestTrip(await this.#getJson(url));
      if (trip) return trip;
    }
    return null;
  }

  async #getJson(url: string): Promise<unknown> {
    const { timeoutMs, retries } = this.options;
    let last: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) await sleep(500 * 2 ** (attempt - 1) + Math.random() * 300);
      try {
        const res = await this.deps.fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
        if (res.ok) return await res.json();
        last = new Error(`SL ${res.status}`);
        if (!RETRYABLE.has(res.status)) break;
      } catch (e) {
        last = e;   // network error, timeout or bad JSON: retry
      }
    }
    throw last;
  }

  /** `work` for every item, `concurrency` at a time. `work` must not throw. */
  async #pool<T>(items: T[], work: (item: T) => Promise<void>) {
    const queue = [...items];
    const runner = async () => { for (let item = queue.shift(); item !== undefined; item = queue.shift()) await work(item); };
    await Promise.all(Array.from({ length: Math.min(this.options.concurrency, items.length) }, runner));
  }
}

function chunks<T>(xs: T[], n: number): T[][] {
  return Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, (i + 1) * n));
}
