import { ListingInput, sanityFlags, type Source } from '@lk/shared';
import type { HttpClient } from '../http.ts';

export interface SourceResult {
  source: Source;
  /** every page was fetched without error; only then may the pipeline mark missing ads as removed */
  complete: boolean;
  fetched: number;
  skipped: number;
  listings: ListingInput[];
  invalid: { item: unknown; issues: string[] }[];
  raw: unknown[];
  error: string | null;
  ms: number;
}

/**
 * One class per site. Subclasses only describe the site: how to page through it and how one item maps
 * to a listing. Paging, validation, counting and error isolation live here, once.
 */
export abstract class SourceAdapter<Item> {
  abstract readonly source: Source;

  /** Raw responses, page by page, until the site has no more. */
  protected abstract pages(http: HttpClient): AsyncIterable<unknown>;
  /** The items in one raw page. */
  protected abstract items(page: unknown): Item[];
  /** A loose listing for ListingInput to validate, or null to skip on purpose (shared room, senior housing …). */
  protected abstract toListing(item: Item): Record<string, unknown> | null;

  async run(http: HttpClient): Promise<SourceResult> {
    const started = Date.now();
    const result: SourceResult = { source: this.source, complete: false, fetched: 0, skipped: 0, listings: [], invalid: [], raw: [], error: null, ms: 0 };
    try {
      for await (const page of this.pages(http)) {
        result.raw.push(page);
        for (const item of this.items(page)) {
          result.fetched++;
          const loose = this.toListing(item);
          if (loose === null) { result.skipped++; continue; }
          const parsed = ListingInput.safeParse({ ...loose, source: this.source });
          if (!parsed.success) {
            result.invalid.push({ item, issues: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) });
            continue;
          }
          const l = parsed.data;
          result.listings.push({ ...l, flags: [...new Set([...l.flags, ...sanityFlags(l)])] });
        }
      }
      result.complete = true;
    } catch (e) {
      result.error = e instanceof Error ? e.message : String(e); // keep what was fetched; complete stays false
    }
    result.ms = Date.now() - started;
    return result;
  }
}
