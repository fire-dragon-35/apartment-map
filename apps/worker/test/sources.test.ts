/**
 * Test 1 of 5 (ARCHITECTURE.md §13): each adapter parses a saved real response into valid listings with the
 * expected count. If a site changes its format, kept drops or invalid rises and this fails.
 * Fixtures: fixtures/<source>.json = 20 items of a real response from 2026-11-23, photos removed.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ADAPTERS } from '../src/sources/index.ts';

// fetched = items in the fixture; skipped = left out on purpose (shared, senior, youth, projects)
const EXPECTED = {
  qasa: { fetched: 20, kept: 13, skipped: 7 },
  homeq: { fetched: 20, kept: 16, skipped: 4 },
  bostadsformedlingen: { fetched: 20, kept: 20, skipped: 0 },
  samtrygg: { fetched: 20, kept: 20, skipped: 0 },
} as const;

for (const adapter of ADAPTERS) {
  test(`${adapter.source} fixture parses into valid listings`, () => {
    const raw = JSON.parse(readFileSync(new URL(`../fixtures/${adapter.source}.json`, import.meta.url), 'utf8')) as unknown[];
    const r = adapter.parse(raw);
    const want = EXPECTED[adapter.source as keyof typeof EXPECTED];

    assert.deepEqual(r.invalid, [], 'no item may be rejected by ListingInput');
    assert.deepEqual({ fetched: r.fetched, kept: r.listings.length, skipped: r.skipped }, want);
    assert.equal(new Set(r.listings.map(l => l.sourceId)).size, r.listings.length, 'source ids are unique');
    for (const l of r.listings) assert.match(l.url, /^https:\/\//);
  });
}
