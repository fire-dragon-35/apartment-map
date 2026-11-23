/** Read side of travel_matrix (ARCHITECTURE.md §8, phase 1.5). The worker writes it; only the service role can read it. */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.ts';

export class MatrixReader {
  constructor(private readonly db: SupabaseClient<Database>) {}

  /**
   * restid in minutes for the requested places from one destination cell. A place the row does not have, or a cell
   * without a row (outside the grid, or not built yet), is simply absent from the result.
   */
  async minutes(cell: string, profile: string, placeIds: number[]): Promise<Map<number, number>> {
    const { data, error } = await this.db.from('travel_matrix').select('place_ids, minutes').eq('cell', cell).eq('profile', profile).maybeSingle();
    if (error) throw new Error(`travel_matrix read: ${error.message}`);
    const index = new Map((data?.place_ids ?? []).map((id, i) => [id, i]));
    const found = new Map<number, number>();
    for (const id of placeIds) {
      const i = index.get(id);
      if (i !== undefined) found.set(id, data!.minutes[i]!);
    }
    return found;
  }
}
