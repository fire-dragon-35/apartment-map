/**
 * Test 2 of 5 (ARCHITECTURE.md §13): a fake two day run on fixtures gives the right new, changed, removed and
 * duplicate rows, and an incomplete source removes nothing. No network: sources replay the fixtures.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { before, test } from 'node:test';
import type { ListingInput, Source } from '@lk/shared';
import { HttpClient } from '../src/http.ts';
import { Pipeline, type Fetcher, type RunSummary } from '../src/services/pipeline.ts';
import { ADAPTERS, type SourceResult } from '../src/sources/index.ts';
import { MemoryStore } from '../src/store/memory.ts';

const DAY1 = '2026-11-23', DAY2 = '2026-11-24';

const fixture = new Map<Source, SourceResult>(ADAPTERS.map(a => [
  a.source, a.parse(JSON.parse(readFileSync(new URL(`../fixtures/${a.source}.json`, import.meta.url), 'utf8')) as unknown[]),
]));
const listingsOf = (s: Source) => fixture.get(s)!.listings;

/** A source that returns what the test gives it, like a stored raw response replayed. */
const fake = (source: Source, listings: ListingInput[], complete = true): Fetcher => ({
  source,
  run: async () => ({
    source, complete, fetched: listings.length, skipped: 0, listings, invalid: [], raw: [{ listings }],
    error: complete ? null : 'page 2: 503', ms: 1,
  }),
});

const runDay = (store: MemoryStore, day: string, fetchers: Fetcher[]) =>
  new Pipeline({ fetchers, http: new HttpClient(), store, clock: { today: () => day, now: () => new Date(`${day}T06:30:00Z`) } }).run();

// Day 2 edits
const qasa = listingsOf('qasa'), homeq = listingsOf('homeq'), samtrygg = listingsOf('samtrygg');
const dropped = qasa.slice(0, 2).map(l => l.sourceId);
const repriced = qasa[2]!;
const original = qasa.slice(3).find(l => l.rent !== null && l.m2 !== null)!; // survives day 2
// a flat that Samtrygg lists too: same place and size, rent 3 % higher
const copy: ListingInput = { ...original, source: 'samtrygg', sourceId: 'copy-of-qasa', url: 'https://www.samtrygg.se/object/copy', rent: Math.round(original.rent! * 1.03) };

let store: MemoryStore, day1: RunSummary, day2: RunSummary, linksAfterDay1: number;

before(async () => {
  store = new MemoryStore();
  const all = [...fixture.keys()].map(s => fake(s, listingsOf(s)));
  day1 = await runDay(store, DAY1, all);
  linksAfterDay1 = store.listingRows.filter(l => l.sameAs !== null).length;

  day2 = await runDay(store, DAY2, [
    fake('qasa', [...qasa.slice(2).filter(l => l !== repriced), { ...repriced, rent: repriced.rent! + 500 }]), // 2 gone, 1 repriced
    fake('homeq', homeq.slice(0, 5), false),                                                                   // fetch died after 5: incomplete
    fake('bostadsformedlingen', listingsOf('bostadsformedlingen')),                                             // unchanged
    fake('samtrygg', [...samtrygg, copy]),                                                                      // 1 new, a copy of a Qasa flat
  ]);
});

const row = (source: Source, sourceId: string) => store.listingRows.find(l => l.source === source && l.sourceId === sourceId)!;
const filesOf = (day: string) => [...store.rawFiles.keys()].filter(p => p.includes(`/${day}-`));
const sourceSummary = (run: RunSummary, s: Source) => run.sources.find(x => x.source === s)!;

test('day 1: everything is new and first_seen is set', () => {
  const total = [...fixture.values()].reduce((n, r) => n + r.listings.length, 0);
  assert.equal(day1.ok, true);
  assert.equal(sourceSummary(day1, 'qasa').new, qasa.length);
  assert.equal(store.sourceRunRows.filter(r => r.runId === day1.runId).length, 4);
  assert.equal(filesOf(DAY1).length, 4);
  for (const r of store.sourceRunRows.filter(r => r.runId === day1.runId)) assert.equal(r.pages, 1, `${r.source} stores its page count`);
  assert.equal(store.listingRows.filter(l => l.firstSeen === DAY1).length, total);
});

test('day 2: new, changed and removed are counted right', () => {
  const q = sourceSummary(day2, 'qasa');
  assert.deepEqual({ new: q.new, changed: q.changed, removed: q.removed, unchanged: q.unchanged }, { new: 0, changed: 1, removed: 2, unchanged: qasa.length - 3 });
  assert.equal(sourceSummary(day2, 'samtrygg').new, 1);
  assert.equal(sourceSummary(day2, 'bostadsformedlingen').new + sourceSummary(day2, 'bostadsformedlingen').removed, 0);

  for (const id of dropped) assert.equal(row('qasa', id).removedAt, DAY2);
  const r = row('qasa', repriced.sourceId);
  assert.equal(r.rent, repriced.rent! + 500);
  assert.equal(r.firstSeen, DAY1, 'first_seen never changes');
  assert.equal(r.lastSeen, DAY2);
  assert.deepEqual(store.changeRows.map(c => [c.listingId, c.seenAt, c.field, c.old, c.new]), [[r.id, DAY2, 'rent', String(repriced.rent), String(repriced.rent! + 500)]]);
});

test('an incomplete source removes nothing', () => {
  const h = sourceSummary(day2, 'homeq');
  assert.equal(h.complete, false);
  assert.equal(h.removed, 0);
  assert.equal(store.listingRows.filter(l => l.source === 'homeq' && l.removedAt !== null).length, 0);
  assert.equal(day2.ok, false, 'the run is flagged');
  assert.match(day2.problems.join(), /homeq/);
});

test('a copy on another site is linked, and the cheapest is the one shown', () => {
  const cheap = row('qasa', original.sourceId), dear = row('samtrygg', 'copy-of-qasa');
  assert.equal(dear.sameAs, cheap.id);
  assert.equal(cheap.sameAs, null);
  assert.equal(linksAfterDay1, 1, 'the fixtures hold one real copy already (Borgarfjordsgatan 2F: Qasa and HomeQ)');
  assert.equal(store.listingRows.filter(l => l.sameAs !== null).length, 2, 'and day 2 added exactly one');
});

test('a source back after an incomplete fetch is not duplicated', async () => {
  const before = store.listingRows.length;
  await runDay(store, '2026-11-25', [fake('homeq', homeq)]);
  assert.equal(store.listingRows.length, before);
  assert.equal(store.listingRows.filter(l => l.source === 'homeq' && l.removedAt !== null).length, 0);
});

test('an unchanged raw response is not stored twice, and still has a file to replay', () => {
  const bf = (runId: number) => store.sourceRunRows.find(r => r.runId === runId && r.source === 'bostadsformedlingen')!;
  assert.equal(sourceSummary(day2, 'bostadsformedlingen').rawReused, true);
  assert.equal(bf(day2.runId).rawPath, bf(day1.runId).rawPath, 'points at the first file');
  assert.equal(bf(day2.runId).rawSha256, bf(day1.runId).rawSha256);
  assert.equal(filesOf(DAY2).length, 3, 'only the three sources whose response changed were uploaded');
  assert.equal(sourceSummary(day2, 'qasa').rawReused, false);
  for (const r of store.sourceRunRows) assert.ok(r.rawPath && store.rawFiles.has(r.rawPath), `${r.source} run ${r.runId} has its file`);
});

test('raw files older than 30 days go, unless a recent run still points at them', async () => {
  const later = await runDay(store, '2027-01-05', [fake('bostadsformedlingen', listingsOf('bostadsformedlingen'))]);
  const bfFile = store.sourceRunRows.find(r => r.runId === later.runId)!.rawPath!;
  assert.match(bfFile, new RegExp(`^bostadsformedlingen/${DAY1}-`), 'still the first file');
  assert.deepEqual([...store.rawFiles.keys()], [bfFile], 'the rest is deleted');
  assert.equal(later.rawPruned, 7);
  for (const r of store.sourceRunRows) assert.ok(r.rawPath === null || store.rawFiles.has(r.rawPath), 'no source run points at a missing file');
  assert.equal(store.sourceRunRows.find(r => r.runId === day1.runId && r.source === 'qasa')!.rawPath, null);
});
