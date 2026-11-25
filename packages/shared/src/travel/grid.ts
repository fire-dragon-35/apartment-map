/**
 * The destinations of the travel time matrix (ARCHITECTURE.md §8), the one source of every restid: H3 cells whose
 * centre lies within 20 km of Karlaplan, plus Karlaplan's exact point (key `karlaplan`), so the free default pin has no
 * cell offset. The one place for these parameters; the worker, the edge function and the router input all derive
 * from here. Relative imports and h3-js only (Node and Deno).
 */
import { cellToLatLng, gridDisk, latLngToCell } from 'h3-js';
import { KARLAPLAN, metresBetween, type LatLon } from '../domain/place.ts';
import { isKarlaplan } from '../domain/travel.ts';

export const GRID = {
  /** about 460 m edge, 0.74 km² */
  resolution: 8,
  radiusKm: 20,
  centre: KARLAPLAN,
} as const;

/** The matrix is for arriving about 08:00 on a weekday (departures 07:30 to 08:00). */
export const MATRIX_PROFILE = 'weekday_0800';
export const MATRIX_DEPARTURE = { from: '07:30', windowMinutes: 30 } as const;
/** Which percentile of the travel times over the departure window is stored (the choice is in ARCHITECTURE.md §8). */
export const MATRIX_PERCENTILE = 25;
/** A place with no R5 trip is walking-only up to this many minutes of walk; beyond it, it is unreachable (stored null). */
export const MATRIX_MAX_WALK_ONLY_MIN = 60;
/** Bump when the rules above change: stored rows of an older version are rebuilt in full. */
export const MATRIX_RULES = 3;   // 3: Karlaplan's exact point added as a destination

export const cellOf = (p: LatLon): string => latLngToCell(p.lat, p.lon, GRID.resolution);

export function cellCentre(cell: string): LatLon {
  const [lat, lon] = cellToLatLng(cell);
  return { lat: lat!, lon: lon! };
}

/** Every destination cell, sorted, so the result is the same every day. About 1 700 cells. */
export function gridCells(): string[] {
  const k = Math.ceil(GRID.radiusKm / 0.7) + 2;   // neighbouring centres are about 0.8 km apart: k rings reach past the radius
  return gridDisk(cellOf(GRID.centre), k)
    .filter(c => metresBetween(GRID.centre, cellCentre(c)) <= GRID.radiusKm * 1000)
    .sort();
}

/** The destination key of Karlaplan's exact point in the matrix. */
export const KARLAPLAN_DEST = 'karlaplan';

/** The matrix row a pin reads: Karlaplan's own, else its cell's (so a custom pin is within half a cell, ~400 m). */
export const destKey = (p: LatLon): string => (isKarlaplan(p) ? KARLAPLAN_DEST : cellOf(p));

/** The point a destination key stands for. */
export const destPoint = (key: string): LatLon => (key === KARLAPLAN_DEST ? KARLAPLAN : cellCentre(key));

/** Every destination of the matrix: the grid cells, then Karlaplan. */
export const matrixDestinations = (): string[] => [...gridCells(), KARLAPLAN_DEST];

/** A box around the grid, `marginKm` wider than the radius, for cropping OpenStreetMap data. */
export function gridBox(marginKm = 0): { minLat: number; minLon: number; maxLat: number; maxLon: number } {
  const km = GRID.radiusKm + marginKm;
  const dLat = km / 111.32;
  const dLon = km / (111.32 * Math.cos((GRID.centre.lat * Math.PI) / 180));
  return { minLat: GRID.centre.lat - dLat, maxLat: GRID.centre.lat + dLat, minLon: GRID.centre.lon - dLon, maxLon: GRID.centre.lon + dLon };
}
