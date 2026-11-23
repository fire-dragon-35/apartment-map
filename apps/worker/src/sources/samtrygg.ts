import { isoDay } from '@lk/shared';
import type { HttpClient } from '../http.ts';
import { SourceAdapter } from './base.ts';

interface SamtryggObject {
  ID: number | string; StreetName?: string; StreetNumber?: string; PostalTown?: string;
  GeographicPositionLat?: number; GeographicPositionLong?: number;
  FormatedHGPrice?: string; SquareMeters?: number; NoOfRooms?: number;
  StartRentalDate?: string; EndRentalDate?: string; RentalObjectLink?: string; HasExtensionChance?: boolean;
}
interface SamtryggPage { SearchResult?: SamtryggObject[] }

/** ASP.NET "/Date(ms)/" → ISO day */
const aspDate = (v?: string) => {
  const ms = v?.match(/\d+/)?.[0];
  return ms ? isoDay(Number(ms)) : null;
};

/** Samtrygg: second-hand rentals, all Stockholm results in one response. Rent includes Samtrygg's fee. */
export class Samtrygg extends SourceAdapter<SamtryggObject> {
  readonly source = 'samtrygg';

  protected async *pages(http: HttpClient) {
    const page = await http.getJson<SamtryggPage>('https://www.samtrygg.se/RentalObject/SearchResult?search=stockholm');
    if (!Array.isArray(page.SearchResult)) throw new Error('unexpected response: no SearchResult');
    yield page;
  }

  protected items(page: unknown) {
    return (page as SamtryggPage).SearchResult ?? [];
  }

  protected toListing(x: SamtryggObject) {
    const link = x.RentalObjectLink ?? '';
    return {
      sourceId: String(x.ID), url: link.startsWith('http') ? link : `https://www.samtrygg.se/${link.replace(/^\//, '')}`,
      lat: x.GeographicPositionLat, lon: x.GeographicPositionLong,
      street: [x.StreetName, x.StreetNumber].filter(Boolean).join(' '), area: x.PostalTown,
      rent: Number((x.FormatedHGPrice ?? '').replace(/\D/g, '')) || null, m2: x.SquareMeters, rooms: x.NoOfRooms,
      startDate: aspDate(x.StartRentalDate), endDate: aspDate(x.EndRentalDate),
      firstHand: false,
      notes: x.HasExtensionChance ? ['extension_possible'] : [],
    };
  }
}
