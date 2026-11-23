import { isoDay } from '@lk/shared';
import type { HttpClient } from '../http.ts';
import { SourceAdapter } from './base.ts';

interface HomeQResult {
  id: number | string; type?: string; audience?: string; title?: string; city?: string; municipality?: string;
  location?: { lat?: number; lon?: number }; rent?: number; area?: number; rooms?: number;
  date_access?: string; uri?: string; is_short_lease?: boolean;
}
interface HomeQPage { total_hits?: number; results?: HomeQResult[] }

/** HomeQ (first-hand, many private landlords). Municipalities 180 Stockholm, 182 Nacka, 183 Sundbyberg, 184 Solna, 186 Lidingö. */
export class HomeQ extends SourceAdapter<HomeQResult> {
  readonly source = 'homeq';
  static readonly SHAPES = ['municipality.180', 'municipality.182', 'municipality.183', 'municipality.184', 'municipality.186'];
  static readonly PAGE = 100;

  protected async *pages(http: HttpClient) {
    for (let page = 1; ; page++) {
      const res = await http.postJson<HomeQPage>('https://api.homeq.se/api/v3/search',
        { shapes: HomeQ.SHAPES, sorting: 'publish_date.desc', page, amount: HomeQ.PAGE });
      if (!Array.isArray(res.results)) throw new Error('unexpected response: no results');
      yield res;
      if (!res.results.length || page * HomeQ.PAGE >= (res.total_hits ?? 0)) return;
    }
  }

  protected items(page: unknown) {
    return (page as HomeQPage).results ?? [];
  }

  protected toListing(x: HomeQResult) {
    if (x.type !== 'individual') return null; // new-build projects have no single rent or size
    if (x.audience && !['everyone', 'student'].includes(x.audience)) return null; // youth / senior only
    return {
      sourceId: String(x.id), url: x.uri ? `https://www.homeq.se${x.uri}` : undefined,
      lat: x.location?.lat, lon: x.location?.lon,
      street: x.title, area: x.city ?? x.municipality,
      rent: x.rent, m2: x.area, rooms: x.rooms,
      startDate: isoDay(x.date_access), endDate: null,
      firstHand: true, student: x.audience === 'student',
      flags: x.is_short_lease ? ['short_lease'] : [],
    };
  }
}
