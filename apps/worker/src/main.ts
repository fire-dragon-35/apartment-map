/**
 * Dry run: fetch every source from this machine, validate, and write the results to out/<date>/.
 * No database yet (ARCHITECTURE.md §16 step 2). Also how fixtures for the source tests are captured.
 *
 *   npm run fetch                 all sources
 *   npm run fetch -- qasa homeq   some sources
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { HttpClient } from './http.ts';
import { ADAPTERS, type SourceResult } from './sources/index.ts';

const wanted = process.argv.slice(2);
const adapters = wanted.length ? ADAPTERS.filter(a => wanted.includes(a.source)) : ADAPTERS;
const day = new Date().toISOString().slice(0, 10);
const dir = new URL(`../out/${day}/`, import.meta.url);
await mkdir(dir, { recursive: true });

const http = new HttpClient();
const results: SourceResult[] = await Promise.all(adapters.map(a => a.run(http)));

for (const r of results) {
  await writeFile(new URL(`${r.source}.raw.json.gz`, dir), gzipSync(JSON.stringify(r.raw)));
  await writeFile(new URL(`${r.source}.listings.json`, dir), JSON.stringify({ ...r, raw: undefined }, null, 1));
}

console.table(results.map(r => ({
  source: r.source, complete: r.complete, fetched: r.fetched, kept: r.listings.length,
  skipped: r.skipped, invalid: r.invalid.length, seconds: Math.round(r.ms / 100) / 10, error: r.error ?? '',
})));
process.exitCode = results.every(r => r.complete) ? 0 : 1;
