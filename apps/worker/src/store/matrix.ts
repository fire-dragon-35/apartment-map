/** travel_matrix in Supabase. Service role only; row level security gives nobody else a policy. */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@lk/shared';
import type { MatrixRepository, MatrixRow, MatrixState } from './types.ts';

const PAGE = 1000;
const WRITE_BATCH = 50;   // rows of ~25 KB of arrays each

const fail = (what: string, e: { message: string }): never => { throw new Error(`travel_matrix ${what}: ${e.message}`); };
const chunks = <T>(xs: T[], n: number): T[][] => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, (i + 1) * n));

export class SupabaseMatrixRepository implements MatrixRepository {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async state(profile: string, referenceCell: string): Promise<MatrixState> {
    const cells: string[] = [];
    for (let from = 0; ; from += PAGE) {   // keys only; the arrays stay in the database
      const { data, error } = await this.db.from('travel_matrix').select('cell').eq('profile', profile).order('cell').range(from, from + PAGE - 1);
      if (error) fail('state', error);
      cells.push(...data!.map(r => r.cell));
      if (data!.length < PAGE) break;
    }
    const { data, error } = await this.db.from('travel_matrix').select('gtfs_hash, place_ids').eq('profile', profile).eq('cell', referenceCell).maybeSingle();
    if (error) fail('state', error);
    return { cells, gtfsHash: data?.gtfs_hash ?? null, placeIds: new Set(data?.place_ids ?? []) };
  }

  async rows(cells: string[], profile: string): Promise<MatrixRow[]> {
    const { data, error } = await this.db.from('travel_matrix').select('cell, place_ids, minutes, gtfs_hash, computed_at').eq('profile', profile).in('cell', cells);
    if (error) fail('read', error);
    return data!.map(r => ({ cell: r.cell, placeIds: r.place_ids, minutes: r.minutes, gtfsHash: r.gtfs_hash, computedAt: new Date(r.computed_at) }));
  }

  async save(rows: MatrixRow[], profile: string): Promise<void> {
    for (const batch of chunks(rows, WRITE_BATCH)) {   // sequential, in order: the reference row goes last
      const { error } = await this.db.from('travel_matrix').upsert(batch.map(r => ({
        cell: r.cell, profile, place_ids: r.placeIds, minutes: r.minutes, gtfs_hash: r.gtfsHash, computed_at: r.computedAt.toISOString(),
      })));
      if (error) fail('write', error);
    }
  }

  async remove(cells: string[], profile: string): Promise<void> {
    for (const batch of chunks(cells, 200)) {
      const { error } = await this.db.from('travel_matrix').delete().eq('profile', profile).in('cell', batch);
      if (error) fail('delete', error);
    }
  }
}
