export interface LatLon { lat: number; lon: number }
export interface PlaceCoord extends LatLon { id: number }

export const KARLAPLAN: LatLon = { lat: 59.3389, lon: 18.0907 };

/** Places are keyed at 4 decimals (about 10 m), so copies of one flat share travel times. */
export const placeKey = (p: LatLon) => `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`;

export function metresBetween(a: LatLon, b: LatLon): number {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

/** Rough box around the Stockholm area; positions outside it are flagged, not dropped. */
export const STOCKHOLM_BOX = { minLat: 59.0, maxLat: 59.75, minLon: 17.5, maxLon: 18.75 };
export const inStockholm = (p: LatLon) =>
  p.lat >= STOCKHOLM_BOX.minLat && p.lat <= STOCKHOLM_BOX.maxLat && p.lon >= STOCKHOLM_BOX.minLon && p.lon <= STOCKHOLM_BOX.maxLon;
