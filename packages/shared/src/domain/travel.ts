import { metresBetween, type LatLon } from './place.ts';

/** DESIGN.md §6: straight line × 1.3 detour at 80 m/min, at least one minute. */
export const WALK = { detour: 1.3, metresPerMinute: 80 } as const;

export const walkMinutes = (from: LatLon, to: LatLon) =>
  Math.max(1, Math.round((metresBetween(from, to) * WALK.detour) / WALK.metresPerMinute));

/** Restid: the faster of walking and transit; walking when transit is unknown. */
export const travelMinutes = (walk: number, transit: number | null) =>
  transit === null || walk <= transit ? walk : transit;
