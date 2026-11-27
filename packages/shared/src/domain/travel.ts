import { CENTRUM, metresBetween, type LatLon } from './place.ts';

/** DESIGN.md §6: straight line × 1.3 detour at 80 m/min, at least one minute. */
export const WALK = { detour: 1.3, metresPerMinute: 80 } as const;

export const walkMinutes = (from: LatLon, to: LatLon) =>
  Math.max(1, Math.round((metresBetween(from, to) * WALK.detour) / WALK.metresPerMinute));

/** Restid: the faster of walking and transit; walking when transit is unknown. */
export const travelMinutes = (walk: number, transit: number | null) =>
  transit === null || walk <= transit ? walk : transit;

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** The cache key of a destination: rounded to 3 decimals (about 100 m). Everything is computed for the cell centre. */
export const destinationCell = (p: LatLon): LatLon => ({ lat: round3(p.lat), lon: round3(p.lon) });

/** Same cell as `is_centrum` in the database: the free default destination. */
export const isCentrum = (p: LatLon) => {
  const [c, k] = [destinationCell(p), destinationCell(CENTRUM)];
  return c.lat === k.lat && c.lon === k.lon;
};
