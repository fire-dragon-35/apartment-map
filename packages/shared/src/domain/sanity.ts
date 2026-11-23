import type { ListingInput } from './listing.ts';
import { inStockholm } from './place.ts';

/** Plausibility checks. They add flags; they never drop a listing (ARCHITECTURE.md §12). */
export function sanityFlags(l: ListingInput): string[] {
  const flags: string[] = [];
  if (!inStockholm(l)) flags.push('outside_area');
  if (l.rent !== null && (l.rent < 1500 || l.rent > 60000)) flags.push('odd_rent');
  if (l.rent !== null && l.m2 !== null) {
    const kpm = l.rent / l.m2;
    if (kpm > 1200) flags.push('odd_kpm');
    if (kpm < 200 && l.firstHand !== true) flags.push('below_market');
  }
  return flags;
}
