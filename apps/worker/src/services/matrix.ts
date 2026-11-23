/**
 * The travel time matrix (ARCHITECTURE.md §8, phase 1.5): restid from every active place to every cell of the grid,
 * so a custom pin is one database read. The router (R5 on this laptop) and the database are passed in.
 *
 * Full rebuild only when the timetable or the grid changed; otherwise only places without a row are computed and
 * appended to every cell row. Deterministic: the same inputs give the same rows.
 */
import {
  cellCentre, gridCells, MATRIX_PROFILE, nextWeekday, travelMinutes, walkMinutes, type LatLon, type PlaceCoord,
} from '@lk/shared';
import type { MatrixRepository, MatrixRow } from '../store/types.ts';

export interface TravelRouter {
  /** Bring the router's inputs up to date; returns the timetable hash. */
  prepare(): Promise<string>;
  /** Median transit minutes, origins × cells, row major; -1 where there is no trip. `date` is YYYY-MM-DD. */
  transit(origins: LatLon[], cells: LatLon[], date: string): Promise<Int16Array>;
}

export interface MatrixSummary {
  cells: number;
  /** places whose row entries were computed in this run */
  computed: number;
  /** true when the timetable or the grid changed and every row was rebuilt */
  full: boolean;
  seconds: number;
}

const MAX_MINUTES = 32767;   // smallint
const ROWS_PER_READ = 100;

export class MatrixService {
  constructor(private readonly deps: { router: TravelRouter; repo: MatrixRepository; now: () => Date }) {}

  async update(places: PlaceCoord[]): Promise<MatrixSummary> {
    const { router, repo, now } = this.deps;
    const started = Date.now();
    const cells = gridCells();
    const reference = cells.at(-1)!;

    const gtfsHash = await router.prepare();
    const state = await repo.state(MATRIX_PROFILE, reference);
    const full = state.gtfsHash !== gtfsHash || state.cells.length !== cells.length || !cells.every(c => state.cells.includes(c));
    const todo = full ? places : places.filter(p => !state.placeIds.has(p.id));
    const summary = (): MatrixSummary => ({ cells: cells.length, computed: todo.length, full, seconds: Math.round((Date.now() - started) / 1000) });
    if (!todo.length) return summary();

    const centres = cells.map(cellCentre);
    const date = nextWeekday(now()).replace(/(\d{4})(\d\d)(\d\d)/, '$1-$2-$3');
    const transit = await router.transit(todo, centres, date);

    // restid as DESIGN.md §6 defines it: walking when R5 has no trip or walking is not slower
    const columns = cells.map((cell, c): MatrixRow => ({
      cell, gtfsHash, computedAt: now(),
      placeIds: todo.map(p => p.id),
      minutes: todo.map((p, o) => {
        const r5 = transit[o * cells.length + c]!;
        return Math.min(MAX_MINUTES, travelMinutes(walkMinutes(p, centres[c]!), r5 < 0 ? null : r5));
      }),
    }));

    const rows = full ? columns : await this.#merge(columns);
    // the reference row last: a run that dies half way leaves it stale, and the next run repairs the rest
    rows.sort((a, b) => Number(a.cell === reference) - Number(b.cell === reference));
    if (full) await repo.remove(state.cells.filter(c => !cells.includes(c)), MATRIX_PROFILE);
    await repo.save(rows, MATRIX_PROFILE);
    return summary();
  }

  /** Append the new places to the stored rows, skipping any a row already has (a half finished earlier run). */
  async #merge(columns: MatrixRow[]): Promise<MatrixRow[]> {
    const merged: MatrixRow[] = [];
    for (let i = 0; i < columns.length; i += ROWS_PER_READ) {
      const batch = columns.slice(i, i + ROWS_PER_READ);
      const stored = new Map((await this.deps.repo.rows(batch.map(b => b.cell), MATRIX_PROFILE)).map(r => [r.cell, r]));
      for (const col of batch) {
        const row = stored.get(col.cell);
        if (!row) { merged.push(col); continue; }
        const have = new Set(row.placeIds);
        const add = col.placeIds.flatMap((id, k) => (have.has(id) ? [] : [k]));
        merged.push({ ...row, placeIds: [...row.placeIds, ...add.map(k => col.placeIds[k]!)], minutes: [...row.minutes, ...add.map(k => col.minutes[k]!)], computedAt: col.computedAt });
      }
    }
    return merged;
  }
}
