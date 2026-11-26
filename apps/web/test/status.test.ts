/** The "Datakällor" rules (status.ts): what counts as complete, old and low. */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isLow, problems, stateOf, type SourceStatus } from '../src/features/data/status.ts';

const NOW = Date.parse('2026-11-25T08:00:00Z');
const row = (over: Partial<SourceStatus> = {}): SourceStatus => ({
  source: 'qasa', started_at: '2026-11-25T05:30:00Z', finished_at: '2026-11-25T05:34:00Z', complete: true, pages: 3, fetched: 210,
  skipped: 5, invalid: 1, kept: 204, error: null, duration_ms: 4000, usual_kept: 200, usual_runs: 7,
  last_complete_at: '2026-11-25T05:34:00Z', active: 190, last_complete_kept: 204, total_listings: 900, ...over,
});

test('complete and recent is ok; incomplete and stale are not', () => {
  assert.equal(stateOf(row(), NOW), 'ok');
  assert.equal(stateOf(row({ complete: false }), NOW), 'incomplete');
  assert.equal(stateOf(row({ last_complete_at: '2026-11-23T05:34:00Z' }), NOW), 'old');
  assert.equal(stateOf(row({ last_complete_at: null }), NOW), 'old');
});

test('low means none, or under half the usual once there are 3 earlier runs', () => {
  assert.equal(isLow(row({ kept: 0 })), true);
  assert.equal(isLow(row({ kept: 99 })), true);
  assert.equal(isLow(row({ kept: 100 })), false);
  assert.equal(isLow(row({ kept: 10, usual_runs: 2 })), false);
});

test('problems lists every source that is not fine', () => {
  const rows = [row(), row({ source: 'homeq', complete: false }), row({ source: 'samtrygg', kept: 3 })];
  assert.deepEqual(problems(rows, NOW), ['HomeQ ofullständig', 'Samtrygg få annonser']);
  assert.deepEqual(problems([row()], NOW), []);
});
