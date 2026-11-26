/**
 * Facebook (ARCHITECTURE.md §6 step 4): offers become listings at the area's centre, each post is read once,
 * and a post that cannot be read makes the run incomplete so nothing is removed. Network, Claude and Nominatim are stubbed.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { HttpClient } from '../src/http.ts';
import { Facebook } from '../src/sources/facebook.ts';
import type { Extracted, Extractor } from '../src/sources/facebook/extract.ts';
import { MemoryFbPosts } from '../src/store/fb-posts.ts';

const post = (id: string, text: string) => ({ postId: id, url: `https://www.facebook.com/groups/1/posts/${id}/`, date: '2026-11-26T08:00:00.000Z', text, groupName: 'Hyra Stockholm' });
const APIFY = [post('1', 'offer'), post('2', 'wanted'), post('3', 'scam'), post('4', 'broken')];
const base: Extracted = { kind: 'offer', scam: false, area: 'Södermalm', street: null, rent: 12000, m2: 35, rooms: 1, start: 'now', end: null, furnished: true, firstHand: false };

function setup(opts: { failOn?: string } = {}) {
  const reads: string[] = [];
  const extractor: Extractor = {
    async extract({ text }) {
      reads.push(text);
      if (text === opts.failOn) throw new Error('Claude down');
      return text === 'wanted' ? { ...base, kind: 'wanted' } : text === 'scam' ? { ...base, scam: true } : base;
    },
  };
  const posts = new MemoryFbPosts();
  const adapter = new Facebook({
    apifyToken: 't', groups: ['https://www.facebook.com/groups/1'], posts, extractor, today: '2026-11-26',
    geocoder: { locate: async area => (area === 'Södermalm' ? { lat: 59.3149, lon: 18.0716 } : null) },
    apifyHttp: { postJson: async () => APIFY } as unknown as HttpClient,
  });
  return { adapter, posts, reads };
}

test('offers become listings at the area centre; wanted and scams are skipped; each post is read once', async () => {
  const { adapter, reads } = setup();
  const r = await adapter.run({} as HttpClient);
  assert.equal(r.complete, true);
  assert.deepEqual(r.listings.map(l => l.sourceId).sort(), ['1', '4']);
  const l = r.listings.find(x => x.sourceId === '1')!;
  assert.deepEqual([l.lat, l.lon, l.exactLocation, l.rent, l.startDate], [59.3149, 18.0716, false, 12000, '2026-11-26']);
  assert.equal(r.skipped, 2);

  await adapter.run({} as HttpClient);
  assert.equal(reads.length, 4, 'the second run reuses what was read');
  assert.deepEqual(adapter.parse(r.raw).listings, r.listings, 'the raw file replays without the network');
});

test('a post that cannot be read makes the run incomplete, so no Facebook listing is removed', async () => {
  const { adapter } = setup({ failOn: 'broken' });
  const r = await adapter.run({} as HttpClient);
  assert.equal(r.complete, false);
  assert.match(r.error ?? '', /1 posts could not be read/);
  assert.deepEqual(r.listings.map(l => l.sourceId), ['1'], 'the readable offers are still kept');
});
