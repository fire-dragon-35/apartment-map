/**
 * Copies of one flat on different sites (ARCHITECTURE.md §6 step 3): same place (±50 m), m² (±2) and rent (±5 %).
 * The cheapest copy stays visible; the others point to it with `same_as`. Pure: candidates in, links out.
 */
import { metresBetween } from '@lk/shared';
import type { DuplicateCandidate } from '../store/types.ts';

const matches = (a: DuplicateCandidate, b: DuplicateCandidate) =>
  a.source !== b.source &&
  a.rent !== null && b.rent !== null && a.m2 !== null && b.m2 !== null &&
  Math.abs(a.m2 - b.m2) <= 2 &&
  Math.abs(a.rent - b.rent) <= 0.05 * Math.max(a.rent, b.rent) &&
  metresBetween(a, b) <= 50;

/** Only the links that differ from what is stored. */
export function duplicateLinks(active: DuplicateCandidate[]): { id: number; sameAs: number | null }[] {
  const cheapestFirst = [...active].sort((a, b) => (a.rent ?? Infinity) - (b.rent ?? Infinity) || a.id - b.id);
  const shown: DuplicateCandidate[] = [];
  const links: { id: number; sameAs: number | null }[] = [];
  for (const c of cheapestFirst) {
    const original = shown.find(s => matches(s, c));
    if (!original) shown.push(c);
    const sameAs = original?.id ?? null;
    if (sameAs !== c.sameAs) links.push({ id: c.id, sameAs });
  }
  return links;
}
