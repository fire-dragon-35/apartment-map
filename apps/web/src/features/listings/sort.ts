import type { Listing } from './Listing.ts';

/** The sort keys of the list. Ties, and missing values, fall back to restid then hyra (DESIGN.md §4.4). */
export type SortKey = 'restid' | 'hyra' | 'storlek' | 'kpm';
export type SortDir = 'asc' | 'desc';
export interface SortState { key: SortKey; dir: SortDir }

export const SORT_OPTIONS: { key: SortKey; label: string; dir: SortDir }[] = [
  { key: 'restid', label: 'Restid', dir: 'asc' },
  { key: 'hyra', label: 'Hyra', dir: 'asc' },
  { key: 'storlek', label: 'Storlek', dir: 'desc' },
  { key: 'kpm', label: 'kr/m²', dir: 'asc' },
];

export const DEFAULT_SORT: SortState = { key: 'restid', dir: 'asc' };

const VALUE: Record<SortKey, (l: Listing) => number | null> = {
  restid: l => l.t,
  hyra: l => l.rent,
  storlek: l => l.m2,
  kpm: l => l.kpm,
};

/** Missing values always go last, whatever the direction. */
export function sortListings(items: Listing[], { key, dir }: SortState): Listing[] {
  const value = VALUE[key];
  const sign = dir === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const x = value(a), y = value(b);
    if (x === null && y !== null) return 1;
    if (y === null && x !== null) return -1;
    if (x !== null && y !== null && x !== y) return (x - y) * sign;
    return a.t - b.t || (a.rent ?? 0) - (b.rent ?? 0);
  });
}
