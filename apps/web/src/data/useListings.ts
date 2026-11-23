import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { stockholmToday } from '@lk/shared';
import { Listing, type ListingRow } from '../domain/Listing.ts';
import { supabase } from './supabase.ts';

const PAGE = 1000;   // PostgREST returns at most this many rows per request

/** The whole view, page by page; normally one request. */
async function fetchRows(): Promise<ListingRow[]> {
  const rows: ListingRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('listings_karlaplan').select('*').order('id').range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

/** Every listing the page can show, loaded once and kept for an hour (ARCHITECTURE.md §9). */
export function useListings() {
  const query = useQuery({ queryKey: ['listings', 'karlaplan'], queryFn: fetchRows, staleTime: 60 * 60 * 1000 });
  const today = stockholmToday();
  const listings = useMemo(() => (query.data ?? []).filter(r => r.id !== null && r.lat !== null && r.lon !== null).map(r => new Listing(r, today)), [query.data, today]);
  return { listings, today, loaded: query.isSuccess, error: query.error as Error | null };
}
