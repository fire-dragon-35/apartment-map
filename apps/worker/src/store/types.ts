/**
 * What the pipeline needs from the database: small repositories, no SQL in the pipeline.
 * `supabase.ts` implements them for production; tests pass an in-memory version.
 */
import type { LatLon, Source } from '@lk/shared';

/** The comparison facts of one listing, as stored. Dates are ISO days. */
export interface ListingFields {
  url: string;
  placeId: number;
  street: string | null;
  area: string | null;
  rent: number | null;
  m2: number | null;
  rooms: number | null;
  startDate: string | null;
  endDate: string | null;
  firstHand: boolean | null;
  student: boolean | null;
  furnished: boolean | null;
  notes: string[];
  flags: string[];
}

export interface NewListing extends ListingFields {
  source: Source;
  sourceId: string;
  contentHash: string;
  firstSeen: string;
  lastSeen: string;
}

export interface StoredListing extends NewListing {
  id: number;
  removedAt: string | null;
  sameAs: number | null;
}

export interface ListingChange { listingId: number; seenAt: string; field: string; old: string | null; new: string | null }

/** An active listing with what duplicate detection compares. */
export interface DuplicateCandidate {
  id: number;
  source: Source;
  lat: number;
  lon: number;
  rent: number | null;
  m2: number | null;
  sameAs: number | null;
}

export interface PlacePoint extends LatLon { exact: boolean }

export interface PlaceRepository {
  /** Ids of the places at these positions (4 decimals), creating the missing ones. Keyed by `placeKey`. */
  resolve(points: PlacePoint[]): Promise<Map<string, number>>;
}

export interface ListingRepository {
  /** Every listing of one source, active or removed. */
  loadSource(source: Source): Promise<StoredListing[]>;
  insert(rows: NewListing[]): Promise<void>;
  /** Rewrite changed listings: new fields and hash, `lastSeen`, and back to active. `firstSeen` is never touched. */
  update(rows: StoredListing[]): Promise<void>;
  /** Seen again today with nothing changed. */
  touch(ids: number[], day: string): Promise<void>;
  markRemoved(ids: number[], day: string): Promise<void>;
  addChanges(rows: ListingChange[]): Promise<void>;
  loadActive(): Promise<DuplicateCandidate[]>;
  /** `sameAs: null` clears a link. */
  setSameAs(links: { id: number; sameAs: number | null }[]): Promise<void>;
}

export interface SourceRunRow {
  runId: number;
  source: Source;
  complete: boolean;
  fetched: number;
  kept: number;
  skipped: number;
  invalid: number;
  error: string | null;
  durationMs: number;
  rawPath: string | null;
  rawSha256: string | null;
}

export interface RunRepository {
  open(startedAt: Date): Promise<number>;
  saveSource(row: SourceRunRow): Promise<void>;
  /** `kept` of this source's last complete runs, newest first, for the coverage check. */
  recentKept(source: Source, runs: number): Promise<number[]>;
  /** The source's newest stored raw file: its path and the sha256 of its body. Null when there is none. */
  latestRaw(source: Source): Promise<{ path: string; sha256: string } | null>;
  /** Raw files that source runs started on or after `day` still point to. */
  rawPathsSince(day: string): Promise<string[]>;
  /** Retention deleted these files: source runs pointing at them lose their `raw_path`. */
  clearRawPaths(paths: string[]): Promise<void>;
  finish(runId: number, ok: boolean): Promise<void>;
}

export interface RawStore {
  put(path: string, gzipped: Uint8Array): Promise<void>;
  /** Every stored file, as `<source>/<file>`. */
  list(): Promise<string[]>;
  /** Delete through the Storage API. */
  remove(paths: string[]): Promise<void>;
}

export interface Store {
  places: PlaceRepository;
  listings: ListingRepository;
  runs: RunRepository;
  raw: RawStore;
}
