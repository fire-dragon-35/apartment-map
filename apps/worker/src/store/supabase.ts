/**
 * The only code that touches SQL (ARCHITECTURE.md §12). Implements the Store repositories on Supabase with the
 * service key, which bypasses row level security.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { placeKey, type Database, type Source } from '@lk/shared';

type Db = SupabaseClient<Database>;
import type {
  DuplicateCandidate, ListingChange, ListingRepository, NewListing, PlacePoint, PlaceRepository, RunRepository,
  SourceRunRow, Store, StoredListing,
} from './types.ts';

const CHUNK = 500;      // rows per request
const PAGE = 1000;      // PostgREST returns at most this many rows per request

const chunks = <T>(xs: T[], n = CHUNK): T[][] => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, (i + 1) * n));

function check<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

type ListingRow = Database['public']['Tables']['listings']['Row'];
const num = (v: number | string | null) => (v === null ? null : Number(v)); // numerics can arrive as strings

const fromRow = (r: ListingRow): StoredListing => ({
  id: r.id, source: r.source as Source, sourceId: r.source_id, url: r.url, placeId: r.place_id, street: r.street, area: r.area,
  rent: r.rent, m2: num(r.m2), rooms: num(r.rooms), startDate: r.start_date, endDate: r.end_date,
  firstHand: r.first_hand, student: r.student, furnished: r.furnished, notes: r.notes, flags: r.flags,
  contentHash: r.content_hash, firstSeen: r.first_seen, lastSeen: r.last_seen, removedAt: r.removed_at, sameAs: r.same_as,
});

const toRow = (l: NewListing) => ({
  source: l.source, source_id: l.sourceId, url: l.url, place_id: l.placeId, street: l.street, area: l.area,
  rent: l.rent, m2: l.m2, rooms: l.rooms, start_date: l.startDate, end_date: l.endDate,
  first_hand: l.firstHand, student: l.student, furnished: l.furnished, notes: l.notes, flags: l.flags,
  content_hash: l.contentHash, first_seen: l.firstSeen, last_seen: l.lastSeen,
});

export class SupabaseStore implements Store {
  readonly places: Store['places'];
  readonly listings: Store['listings'];
  readonly runs: Store['runs'];
  readonly raw: Store['raw'];

  constructor(private readonly db: Db, rawBucket = 'raw') {
    this.places = new Places(db);
    this.listings = new Listings(db);
    this.runs = new Runs(db);
    this.raw = {
      put: async (path, bytes) => {
        const { error } = await db.storage.from(rawBucket).upload(path, bytes, { contentType: 'application/gzip', upsert: true });
        if (error) throw new Error(`storage ${path}: ${error.message}`);
      },
    };
  }

  static fromEnv(env: NodeJS.ProcessEnv = process.env): SupabaseStore {
    const url = env.SUPABASE_URL, key = env.SUPABASE_SERVICE_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (see .env.example)');
    return new SupabaseStore(createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));
  }
}

/** Every row of a query, page by page. */
async function selectAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>, what: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const rows = check(await page(from, from + PAGE - 1), what);
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

class Places implements PlaceRepository {
  constructor(private readonly db: Db) {}

  async resolve(points: PlacePoint[]) {
    const byKey = new Map<string, { lat: number; lon: number; exact: boolean }>();
    for (const p of points) {
      const key = placeKey(p), had = byKey.get(key);
      byKey.set(key, { lat: Number(p.lat.toFixed(4)), lon: Number(p.lon.toFixed(4)), exact: (had?.exact ?? false) || p.exact });
    }
    const ids = new Map<string, number>();
    for (const batch of chunks([...byKey.values()])) {
      const rows = check(await this.db.from('places').upsert(batch, { onConflict: 'lat,lon' }).select('id,lat,lon'), 'places') as { id: number; lat: number | string; lon: number | string }[];
      for (const r of rows) ids.set(placeKey({ lat: Number(r.lat), lon: Number(r.lon) }), r.id);
    }
    return ids;
  }
}

class Listings implements ListingRepository {
  constructor(private readonly db: Db) {}

  async loadSource(source: Source) {
    const rows = await selectAll<ListingRow>((a, b) => this.db.from('listings').select('*').eq('source', source).order('id').range(a, b), 'load listings');
    return rows.map(fromRow);
  }

  async insert(rows: NewListing[]) {
    for (const batch of chunks(rows)) check(await this.db.from('listings').insert(batch.map(toRow)), 'insert listings');
  }

  async update(rows: StoredListing[]) {
    // upsert on the natural key; first_seen comes from the stored row, so it never moves
    for (const batch of chunks(rows)) {
      check(await this.db.from('listings').upsert(
        batch.map(r => ({ ...toRow(r), removed_at: null })), { onConflict: 'source,source_id' }), 'update listings');
    }
  }

  async touch(ids: number[], day: string) {
    for (const batch of chunks(ids)) check(await this.db.from('listings').update({ last_seen: day, removed_at: null }).in('id', batch), 'touch listings');
  }

  async markRemoved(ids: number[], day: string) {
    for (const batch of chunks(ids)) check(await this.db.from('listings').update({ removed_at: day }).in('id', batch), 'remove listings');
  }

  async addChanges(rows: ListingChange[]) {
    for (const batch of chunks(rows)) {
      check(await this.db.from('listing_changes').insert(batch.map(c => ({ listing_id: c.listingId, seen_at: c.seenAt, field: c.field, old: c.old, new: c.new }))), 'listing_changes');
    }
  }

  async loadActive(): Promise<DuplicateCandidate[]> {
    type Row = { id: number; source: Source; rent: number | null; m2: number | string | null; same_as: number | null; places: { lat: number | string; lon: number | string } };
    const rows = await selectAll<Row>((a, b) => this.db.from('listings').select('id,source,rent,m2,same_as,places(lat,lon)').is('removed_at', null).order('id').range(a, b) as never, 'load active');
    return rows.map(r => ({ id: r.id, source: r.source, lat: Number(r.places.lat), lon: Number(r.places.lon), rent: r.rent, m2: num(r.m2), sameAs: r.same_as }));
  }

  async setSameAs(links: { id: number; sameAs: number | null }[]) {
    const byTarget = new Map<number | null, number[]>();
    for (const l of links) byTarget.set(l.sameAs, [...(byTarget.get(l.sameAs) ?? []), l.id]);
    for (const [target, ids] of byTarget) {
      for (const batch of chunks(ids)) check(await this.db.from('listings').update({ same_as: target }).in('id', batch), 'same_as');
    }
  }
}

class Runs implements RunRepository {
  constructor(private readonly db: Db) {}

  async open() {
    return (check(await this.db.from('runs').insert({}).select('id').single(), 'open run') as { id: number }).id;
  }

  async saveSource(r: SourceRunRow) {
    check(await this.db.from('source_runs').upsert({
      run_id: r.runId, source: r.source, complete: r.complete, fetched: r.fetched, kept: r.kept, skipped: r.skipped,
      invalid: r.invalid, error: r.error, duration_ms: r.durationMs, raw_path: r.rawPath,
    }), 'save source run');
  }

  async recentKept(source: Source, runs: number) {
    const rows = check(await this.db.from('source_runs').select('kept').eq('source', source).eq('complete', true).order('run_id', { ascending: false }).limit(runs), 'recent runs') as { kept: number }[];
    return rows.map(r => r.kept);
  }

  async finish(runId: number, ok: boolean) {
    check(await this.db.from('runs').update({ finished_at: new Date().toISOString(), ok }).eq('id', runId), 'finish run');
  }
}
