/**
 * The destination grid of the travel time matrix (ARCHITECTURE.md §8, phase 1.5): H3 cells whose centre lies within
 * 20 km of Karlaplan. The one place for these parameters; the worker, the edge function and the router input all derive
 * from here. Relative imports and h3-js only (Node and Deno).
 */
import { cellToLatLng, gridDisk, latLngToCell } from 'h3-js';
import { KARLAPLAN, metresBetween, type LatLon } from '../domain/place.ts';

export const GRID = {
  /** about 460 m edge, 0.74 km² */
  resolution: 8,
  radiusKm: 20,
  centre: KARLAPLAN,
} as const;

/** The matrix is for arriving about 08:00 on a weekday (departures 07:30 to 08:00), like the SL profile. */
export const MATRIX_PROFILE = 'weekday_0800';
export const MATRIX_DEPARTURE = { from: '07:30', windowMinutes: 30 } as const;

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

/** A box around the grid, `marginKm` wider than the radius, for cropping OpenStreetMap data. */
export function gridBox(marginKm = 0): { minLat: number; minLon: number; maxLat: number; maxLon: number } {
  const km = GRID.radiusKm + marginKm;
  const dLat = km / 111.32;
  const dLon = km / (111.32 * Math.cos((GRID.centre.lat * Math.PI) / 180));
  return { minLat: GRID.centre.lat - dLat, maxLat: GRID.centre.lat + dLat, minLon: GRID.centre.lon - dLon, maxLon: GRID.centre.lon + dLon };
}
