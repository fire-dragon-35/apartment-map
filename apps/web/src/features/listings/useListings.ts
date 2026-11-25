import { useEffect, useMemo, useState } from 'react';
import { stockholmToday } from '@lk/shared';
import { rest } from '../../app/api.ts';
import { Listing, type ListingRow } from './Listing.ts';

const PAGE = 1000;   // PostgREST returns at most this many rows per request
/** the columns the page reads */
const COLUMNS = 'id,place_id,source,url,street,area,rent,m2,rooms,kpm,start_date,end_date,first_hand,student,furnished,notes,flags,first_seen,lat,lon,minutes,also_on';

/** The whole view, page by page; normally one request. */
async function fetchRows(): Promise<ListingRow[]> {
  const rows: ListingRow[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const data = await rest<ListingRow[]>(`listings_karlaplan?select=${COLUMNS}&order=id&limit=${PAGE}&offset=${offset}`);
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

/** Started when the module loads, so the request runs while React and Leaflet start up. One retry. */
const request = fetchRows().catch(fetchRows);

/** Every listing the page can show, loaded once per page load (ARCHITECTURE.md §9). */
export function useListings() {
  const [rows, setRows] = useState<ListingRow[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [today] = useState(stockholmToday);
  useEffect(() => { request.then(setRows, (e: unknown) => setError(e instanceof Error ? e : new Error(String(e)))); }, []);
  const listings = useMemo(() => (rows ?? []).filter(r => r.id !== null && r.lat !== null && r.lon !== null).map(r => new Listing(r, today)), [rows, today]);
  return { listings, today, loaded: rows !== null, error };
}
