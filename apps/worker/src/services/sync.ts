/** Writes one source's validated listings to the database (ARCHITECTURE.md §6 step 2.3 and 2.4). */
import { placeKey, type ListingInput, type Source } from '@lk/shared';
import type { ListingChange, NewListing, StoredListing, Store } from '../store/types.ts';
import { contentHash, diffFields, toFields } from './listing-rules.ts';

export interface SyncCounts { new: number; changed: number; unchanged: number; reappeared: number; removed: number }

export class SourceSync {
  constructor(private readonly store: Store, private readonly day: string) {}

  /**
   * New listings get `first_seen = today`; known ones get `last_seen = today`, and a changed one a `listing_changes` row.
   * Only a `complete` fetch may mark the source's other listings removed.
   */
  async apply(source: Source, listings: ListingInput[], complete: boolean): Promise<SyncCounts> {
    const { places, listings: repo } = this.store;
    const counts: SyncCounts = { new: 0, changed: 0, unchanged: 0, reappeared: 0, removed: 0 };
    const seen = new Map(listings.map(l => [l.sourceId, l]));

    const placeIds = await places.resolve([...seen.values()].map(l => ({ lat: l.lat, lon: l.lon, exact: l.exactLocation })));
    const known = new Map((await repo.loadSource(source)).map(s => [s.sourceId, s]));

    const inserts: NewListing[] = [];
    const updates: StoredListing[] = [];
    const touched: number[] = [];
    const changes: ListingChange[] = [];

    for (const [sourceId, l] of seen) {
      const placeId = placeIds.get(placeKey(l));
      if (placeId === undefined) throw new Error(`no place for ${source} ${sourceId}`);
      const fields = toFields(l, placeId);
      const hash = contentHash(fields);
      const old = known.get(sourceId);

      if (!old) {
        inserts.push({ ...fields, source, sourceId, contentHash: hash, firstSeen: this.day, lastSeen: this.day });
        counts.new++;
      } else if (old.contentHash !== hash) {
        updates.push({ ...old, ...fields, contentHash: hash, lastSeen: this.day, removedAt: null });
        for (const d of diffFields(old, fields)) changes.push({ listingId: old.id, seenAt: this.day, ...d });
        counts.changed++;
      } else {
        if (old.lastSeen !== this.day || old.removedAt !== null) touched.push(old.id);
        if (old.removedAt !== null) counts.reappeared++; else counts.unchanged++;
      }
    }

    await repo.insert(inserts);
    await repo.update(updates);
    await repo.touch(touched, this.day);
    await repo.addChanges(changes);

    if (complete) {
      const gone = [...known.values()].filter(s => s.removedAt === null && !seen.has(s.sourceId)).map(s => s.id);
      await repo.markRemoved(gone, this.day);
      counts.removed = gone.length;
    }
    return counts;
  }
}
