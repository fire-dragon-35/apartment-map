import { isoDay } from '@lk/shared';
import type { HttpClient } from '../http.ts';
import { SourceAdapter } from './base.ts';

interface BfAd {
  AnnonsId: number; Gatuadress?: string; Stadsdel?: string; Kommun?: string;
  KoordinatLatitud?: number; KoordinatLongitud?: number; Hyra?: number; Yta?: number; AntalRum?: number;
  Inflyttningsdatum?: string; Url?: string; Ungdom?: boolean; Senior?: boolean; Student?: boolean; Korttid?: boolean;
}

/** Stockholms stads Bostadsförmedling: all ads in one response. Queue data is not shown (DESIGN.md). */
export class Bostadsformedlingen extends SourceAdapter<BfAd> {
  readonly source = 'bostadsformedlingen';

  protected async *pages(http: HttpClient) {
    const all = await http.getJson<unknown>('https://bostad.stockholm.se/AllaAnnonser/');
    if (!Array.isArray(all)) throw new Error('unexpected response: not a list');
    yield all;
  }

  protected items(page: unknown) {
    return page as BfAd[];
  }

  protected toListing(x: BfAd) {
    if (x.Ungdom || x.Senior) return null;
    const id = (x.Url ?? '').replace(/\D/g, '') || String(x.AnnonsId);
    return {
      sourceId: String(x.AnnonsId), url: `https://bostad.stockholm.se/bostad/${id}/`,
      lat: x.KoordinatLatitud, lon: x.KoordinatLongitud,
      street: x.Gatuadress, area: x.Stadsdel ?? x.Kommun,
      rent: x.Hyra, m2: x.Yta, rooms: x.AntalRum,
      startDate: isoDay(x.Inflyttningsdatum), endDate: null,
      firstHand: true, student: x.Student ?? null,
      flags: x.Korttid ? ['short_lease'] : [],
    };
  }
}
