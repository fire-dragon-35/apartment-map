/** In-memory Store with the same semantics as the Supabase one. For tests; nothing touches the network. */
import { placeKey, type Source } from '@lk/shared';
import type {
  DuplicateCandidate, ListingChange, NewListing, PlacePoint, SourceRunRow, StoredListing, Store,
} from './types.ts';

export class MemoryStore implements Store {
  readonly placeRows = new Map<string, { id: number; lat: number; lon: number; exact: boolean }>();
  readonly listingRows: StoredListing[] = [];
  readonly changeRows: ListingChange[] = [];
  readonly runRows: { id: number; ok: boolean | null }[] = [];
  readonly sourceRunRows: SourceRunRow[] = [];
  readonly rawFiles = new Map<string, Uint8Array>();

  readonly places = {
    resolve: async (points: PlacePoint[]) => {
      const ids = new Map<string, number>();
      for (const p of points) {
        const key = placeKey(p);
        let row = this.placeRows.get(key);
        if (!row) {
          row = { id: this.placeRows.size + 1, lat: Number(p.lat.toFixed(4)), lon: Number(p.lon.toFixed(4)), exact: p.exact };
          this.placeRows.set(key, row);
        }
        ids.set(key, row.id);
      }
      return ids;
    },
  };

  readonly listings = {
    loadSource: async (source: Source) => this.listingRows.filter(l => l.source === source).map(l => ({ ...l })),
    insert: async (rows: NewListing[]) => {
      for (const r of rows) {
        if (this.listingRows.some(l => l.source === r.source && l.sourceId === r.sourceId)) throw new Error('unique (source, source_id)');
        this.listingRows.push({ ...r, id: this.listingRows.length + 1, removedAt: null, sameAs: null });
      }
    },
    update: async (rows: StoredListing[]) => {
      for (const r of rows) {
        const i = this.listingRows.findIndex(l => l.id === r.id);
        const kept = this.listingRows[i]!;
        this.listingRows[i] = { ...r, firstSeen: kept.firstSeen, sameAs: kept.sameAs };
      }
    },
    touch: async (ids: number[], day: string) => {
      for (const l of this.listingRows) if (ids.includes(l.id)) { l.lastSeen = day; l.removedAt = null; }
    },
    markRemoved: async (ids: number[], day: string) => {
      for (const l of this.listingRows) if (ids.includes(l.id)) l.removedAt = day;
    },
    addChanges: async (rows: ListingChange[]) => { this.changeRows.push(...rows); },
    loadActive: async (): Promise<DuplicateCandidate[]> =>
      this.listingRows.filter(l => l.removedAt === null).map(l => {
        const p = [...this.placeRows.values()].find(p => p.id === l.placeId)!;
        return { id: l.id, source: l.source, lat: p.lat, lon: p.lon, rent: l.rent, m2: l.m2, sameAs: l.sameAs };
      }),
    setSameAs: async (links: { id: number; sameAs: number | null }[]) => {
      for (const { id, sameAs } of links) this.listingRows.find(l => l.id === id)!.sameAs = sameAs;
    },
  };

  readonly runs = {
    open: async () => { this.runRows.push({ id: this.runRows.length + 1, ok: null }); return this.runRows.length; },
    saveSource: async (row: SourceRunRow) => { this.sourceRunRows.push(row); },
    recentKept: async (source: Source, runs: number) =>
      this.sourceRunRows.filter(r => r.source === source && r.complete).map(r => r.kept).reverse().slice(0, runs),
    finish: async (runId: number, ok: boolean) => { this.runRows.find(r => r.id === runId)!.ok = ok; },
  };

  readonly raw = {
    put: async (path: string, bytes: Uint8Array) => { this.rawFiles.set(path, bytes); },
  };
}
