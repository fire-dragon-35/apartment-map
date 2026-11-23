/**
 * SL journey planner (keyless): URL, and a trip's response turned into minutes and legs.
 * Pure and runtime neutral (Node and Deno): relative imports only, no zod, no node: modules.
 */
import type { LatLon } from '../domain/place.ts';

export type Mode = 'walk' | 'metro' | 'train' | 'tram' | 'bus' | 'boat' | 'other';
/** Same shape as legacy routes.json: [mode, line, [[lat, lon], …], minutes, stops] */
export type Leg = [mode: Mode, line: string, coords: [number, number][], minutes: number, stops: number];
export interface Trip { minutes: number; legs: Leg[] }

/** SL product class → mode */
const MODES: Record<number, Mode> = { 1: 'train', 2: 'metro', 4: 'tram', 5: 'bus', 9: 'boat', 99: 'walk', 100: 'walk' };
export const MAX_POINTS = 60;

const round5 = (n: number) => Math.round(n * 1e5) / 1e5;

/** At most `max` points, evenly spread, first and last kept, rounded to 5 decimals, repeated points dropped. */
export function thin(coords: readonly (readonly number[])[], max = MAX_POINTS): [number, number][] {
  const c = coords.map(p => [round5(p[0]!), round5(p[1]!)] as [number, number])
    .filter((p, i, all) => i === 0 || p[0] !== all[i - 1]![0] || p[1] !== all[i - 1]![1]);
  if (c.length <= max) return c;
  const step = (c.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => c[Math.round(i * step)]!);
}

export const ARRIVE_BY: Record<string, string> = { weekday_0800: '0800' };

/** `date` is YYYYMMDD. Arrive at `hhmm`, coordinates are WGS84. */
export function tripUrl(from: LatLon, to: LatLon, date: string, hhmm: string): string {
  const c = (p: LatLon) => `${p.lon}:${p.lat}:WGS84[dd.ddddd]`;
  return 'https://journeyplanner.integration.sl.se/v2/trips?type_origin=coord'
    + `&name_origin=${c(from)}&type_destination=coord&name_destination=${c(to)}`
    + `&calc_number_of_trips=3&itd_date=${date}&itd_time=${hhmm}&itdTripDateTimeDepArr=arr`;
}

/** The next weekday after `now`, in Stockholm, as YYYYMMDD. */
export function nextWeekday(now: Date): string {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Stockholm' }).format(now).split('-').map(Number) as [number, number, number];
  const day = new Date(Date.UTC(y, m - 1, d + 1));
  while (day.getUTCDay() === 0 || day.getUTCDay() === 6) day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10).replaceAll('-', '');
}

interface SlLeg {
  duration?: number; coords?: number[][]; stopSequence?: unknown[];
  origin?: { coord?: number[] }; destination?: { coord?: number[] };
  transportation?: { disassembledName?: string; product?: { class?: number } };
}

/** The fastest of the returned journeys, or null when SL has none. */
export function fastestTrip(response: unknown): Trip | null {
  const journeys = (response as { journeys?: { tripDuration?: number; legs?: SlLeg[] }[] } | null)?.journeys;
  const timed = (journeys ?? []).filter(j => typeof j.tripDuration === 'number');
  if (!timed.length) return null;
  const best = timed.reduce((a, b) => (b.tripDuration! < a.tripDuration! ? b : a));

  const legs: Leg[] = [];
  for (const l of best.legs ?? []) {
    const t = l.transportation ?? {};
    const mode = MODES[t.product?.class ?? -1] ?? 'other';
    const coords = l.coords ?? [l.origin?.coord, l.destination?.coord].filter((p): p is number[] => !!p);
    if (coords.length < 2) continue;
    const minutes = Math.round((l.duration ?? 0) / 60);
    const stops = mode === 'walk' ? 0 : Math.max((l.stopSequence?.length ?? 0) - 1, 0);
    const prev = legs.at(-1);
    if (prev && prev[0] === 'walk' && mode === 'walk') {   // consecutive walking legs become one
      prev[2] = thin([...prev[2], ...coords]);
      prev[3] += minutes;
    } else {
      legs.push([mode, t.disassembledName ?? '', thin(coords), minutes, stops]);
    }
  }
  return { minutes: Math.round(best.tripDuration! / 60), legs };
}
