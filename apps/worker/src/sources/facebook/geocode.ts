/** Area name → its centre, through OpenStreetMap's Nominatim (one request a second, as its policy asks). */
import type { HttpClient } from '../../http.ts';

export interface Geocoder {
  /** Null when the place is unknown or outside Greater Stockholm. */
  locate(area: string): Promise<{ lat: number; lon: number } | null>;
}

// Stockholm county's built-up core: a hit outside is a different place with the same name
const VIEWBOX = '17.55,59.65,18.65,59.05';

export class NominatimGeocoder implements Geocoder {
  readonly #cache = new Map<string, { lat: number; lon: number } | null>();

  constructor(private readonly http: HttpClient, private readonly userAgent: string) {}

  async locate(area: string) {
    const key = area.trim().toLowerCase();
    if (this.#cache.has(key)) return this.#cache.get(key)!;
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=se&bounded=1&viewbox=${VIEWBOX}&q=${encodeURIComponent(area)}`;
    const hits = await this.http.getJsonWith<{ lat: string; lon: string }[]>(url, { 'user-agent': this.userAgent });
    const hit = hits[0] ? { lat: Number(hits[0].lat), lon: Number(hits[0].lon) } : null;
    this.#cache.set(key, hit);
    return hit;
  }
}
