import { isoDay } from '@lk/shared';
import type { HttpClient } from '../http.ts';
import { SourceAdapter } from './base.ts';

interface QasaHome {
  id: string; monthlyCost?: number; roomCount?: number; squareMeters?: number;
  shared?: boolean; firstHand?: boolean; studentHome?: boolean; seniorHome?: boolean;
  location?: { locality?: string; route?: string; streetNumber?: string; point?: { lat?: number; lon?: number } };
  startDate?: string; endDate?: string;
}
interface QasaPage { data?: { homeIndexSearch?: { documents?: { totalCount: number; nodes: QasaHome[] } } } }

/** Qasa (also carries Blocket Bostad). GraphQL search, 100 per page, newest first. */
export class Qasa extends SourceAdapter<QasaHome> {
  readonly source = 'qasa';
  static readonly AREAS = ['se/stockholm', 'se/solna', 'se/sundbyberg', 'se/lidingo', 'se/nacka'];
  static readonly PAGE = 100;

  protected async *pages(http: HttpClient) {
    for (let offset = 0; ; offset += Qasa.PAGE) {
      const query = `{ homeIndexSearch(order:{direction: descending, orderBy: published_or_bumped_at},
        params:{areaIdentifier:${JSON.stringify(Qasa.AREAS)}, homeType:[apartment]}) {
        documents(limit:${Qasa.PAGE}, offset:${offset}) { totalCount nodes { id monthlyCost roomCount squareMeters shared
          firstHand studentHome seniorHome location { locality route streetNumber point { lat lon } } startDate endDate } } } }`;
      const page = await http.postJson<QasaPage>('https://api.qasa.se/graphql', { query });
      const docs = page.data?.homeIndexSearch?.documents;
      if (!docs) throw new Error('unexpected response: no documents');
      yield page;
      if (offset + Qasa.PAGE >= docs.totalCount) return;
    }
  }

  protected items(page: unknown) {
    return (page as QasaPage).data?.homeIndexSearch?.documents?.nodes ?? [];
  }

  protected toListing(h: QasaHome) {
    if (h.shared || h.seniorHome) return null;
    const loc = h.location ?? {};
    return {
      sourceId: String(h.id), url: `https://qasa.com/se/sv/home/${h.id}`,
      lat: loc.point?.lat, lon: loc.point?.lon,
      street: [loc.route, loc.streetNumber].filter(Boolean).join(' '), area: loc.locality,
      rent: h.monthlyCost, m2: h.squareMeters, rooms: h.roomCount,
      startDate: isoDay(h.startDate), endDate: isoDay(h.endDate),
      firstHand: h.firstHand ?? null, student: h.studentHome ?? null,
    };
  }
}
