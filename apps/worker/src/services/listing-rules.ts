/** Pure rules for turning a validated listing into a stored row: hash and field-level diff. */
import { createHash } from 'node:crypto';
import type { ListingInput } from '@lk/shared';
import type { ListingFields } from '../store/types.ts';

export function toFields(l: ListingInput, placeId: number): ListingFields {
  return {
    url: l.url, placeId, street: l.street, area: l.area, rent: l.rent, m2: l.m2, rooms: l.rooms,
    startDate: l.startDate, endDate: l.endDate, firstHand: l.firstHand, student: l.student, furnished: l.furnished,
    notes: l.notes, flags: l.flags,
  };
}

const FIELDS: (keyof ListingFields)[] = [
  'url', 'placeId', 'street', 'area', 'rent', 'm2', 'rooms', 'startDate', 'endDate',
  'firstHand', 'student', 'furnished', 'notes', 'flags',
];

const text = (v: unknown): string | null => (v === null || v === undefined ? null : Array.isArray(v) ? [...v].sort().join(',') : String(v));

/** Same facts give the same hash; a row is rewritten only when it changes (ARCHITECTURE.md §12). */
export function contentHash(f: ListingFields): string {
  return createHash('sha256').update(JSON.stringify(FIELDS.map(k => text(f[k])))).digest('hex').slice(0, 32);
}

/** Fields whose value differs, as text for `listing_changes`. `placeId` is reported as `position`. */
export function diffFields(before: ListingFields, after: ListingFields): { field: string; old: string | null; new: string | null }[] {
  return FIELDS.flatMap(k => {
    const [o, n] = [text(before[k]), text(after[k])];
    return o === n ? [] : [{ field: k === 'placeId' ? 'position' : k, old: o, new: n }];
  });
}


