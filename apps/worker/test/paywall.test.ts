/**
 * Test 4 of 5 (ARCHITECTURE.md §13): an anonymous and a free user cannot read other users' rows or the travel matrix;
 * the travel-times function answers from the matrix, open for Karlaplan and 402 for them on a custom pin.
 * Runs against LOCAL Supabase only (`npx supabase start`); without it the test is skipped, visibly.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { after, before, test } from 'node:test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cellOf, handleTravelTimes, KARLAPLAN_DEST, MATRIX_PROFILE, type Database } from '@lk/shared';

type Db = SupabaseClient<Database>;

function localSupabase(): { url: string; anon: string; service: string } | null {
  try {
    const out = execFileSync('npx', ['supabase', 'status', '-o', 'env'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 30_000 });
    const env = Object.fromEntries([...out.matchAll(/^(\w+)="(.*)"$/gm)].map(m => [m[1], m[2]]));
    return env.API_URL && env.ANON_KEY && env.SERVICE_ROLE_KEY ? { url: env.API_URL, anon: env.ANON_KEY, service: env.SERVICE_ROLE_KEY } : null;
  } catch { return null; }
}

const local = localSupabase();
const SKIP = local ? false : 'local Supabase is not running (npx supabase start): paywall not tested';
const KARLAPLAN = { lat: 59.339, lon: 18.091 };   // the free pin
const CUSTOM = { lat: 59.33, lon: 18.07 };        // somebody's own pin
const PLACE = { lat: 59.4999, lon: 18.4999 };     // a place only this test uses
const UNREACHABLE = 2_000_000_001;   // a place in the fixture matrix row with no trip and a long walk: null minutes
const noOpts = { auth: { persistSession: false, autoRefreshToken: false } };

let service: Db, anon: Db, free: Db, paying: Db, placeId: number;
const tokens = { free: '', paying: '' };
const users: string[] = [];
const bearer = (url: string, key: string, token: string): Db =>
  createClient<Database>(url, key, { ...noOpts, global: { headers: { Authorization: `Bearer ${token}` } } });

async function signedIn(url: string, anonKey: string, email: string): Promise<{ client: Db; id: string; token: string }> {
  const password = 'test-password-123';
  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(error);
  users.push(data.user.id);
  const session = await createClient<Database>(url, anonKey, noOpts).auth.signInWithPassword({ email, password });
  assert.ifError(session.error);
  const token = session.data.session!.access_token;
  return { client: bearer(url, anonKey, token), id: data.user.id, token };
}

before(async () => {
  if (!local) return;
  service = createClient<Database>(local.url, local.service, noOpts);
  anon = createClient<Database>(local.url, local.anon, noOpts);

  const place = await service.from('places').upsert(PLACE, { onConflict: 'lat,lon' }).select('id').single();
  assert.ifError(place.error);
  placeId = place.data!.id;
  // matrix rows: Karlaplan's exact point 21, the custom pin's cell 19
  assert.ifError((await service.from('travel_matrix').upsert([
    { cell: KARLAPLAN_DEST, profile: MATRIX_PROFILE, place_ids: [placeId], minutes: [21], gtfs_hash: 'test' },
    { cell: cellOf(CUSTOM), profile: MATRIX_PROFILE, place_ids: [placeId, UNREACHABLE], minutes: [19, null] as unknown as number[], gtfs_hash: 'test' },
  ])).error);

  const stamp = Date.now();
  const f = await signedIn(local.url, local.anon, `free-${stamp}@example.test`);
  const p = await signedIn(local.url, local.anon, `paying-${stamp}@example.test`);
  free = f.client; paying = p.client;
  tokens.free = f.token; tokens.paying = p.token;
  assert.ifError((await (service as unknown as SupabaseClient).from('frame_subscriptions').insert({ user_id: p.id, status: 'active', current_period_end: new Date(Date.now() + 864e5).toISOString() })).error);
  assert.ifError((await service.from('destinations').insert({ user_id: p.id, label: 'Jobbet', lat: CUSTOM.lat, lon: CUSTOM.lon })).error);
});

after(async () => {
  if (!local) return;
  await service.from('travel_matrix').delete().in('cell', [cellOf(CUSTOM), KARLAPLAN_DEST]).eq('profile', MATRIX_PROFILE);
  await service.from('places').delete().eq('id', placeId);
  for (const id of users) await service.auth.admin.deleteUser(id);   // cascades to subscriptions and destinations
});

test('the travel matrix is not readable through the API by anyone but the service role', { skip: SKIP }, async () => {
  for (const [name, db] of [['anonymous', anon], ['free', free], ['paying', paying]] as const) {
    const { data } = await db.from('travel_matrix').select('cell');
    assert.deepEqual(data ?? [], [], `${name} reads no matrix rows`);
  }
  assert.equal((await service.from('travel_matrix').select('cell').eq('cell', cellOf(CUSTOM))).data!.length, 1, 'the service role does');
});

test('other users\' rows are not readable, and a free user cannot save a custom pin', { skip: SKIP }, async () => {
  for (const [name, db] of [['anonymous', anon], ['free', free]] as const) {
    assert.deepEqual((await db.from('destinations').select('id')).data ?? [], [], `${name} sees no destinations`);
  }
  assert.equal((await paying.from('destinations').select('id')).data!.length, 1, 'a paying user sees their own');
  const { data: me } = await free.auth.getUser();
  const custom = await free.from('destinations').insert({ user_id: me.user!.id, label: 'x', lat: CUSTOM.lat, lon: CUSTOM.lon });
  assert.ok(custom.error, 'a free user cannot insert a custom pin');
  assert.ifError((await free.from('destinations').insert({ user_id: me.user!.id, label: 'Karlaplan', lat: KARLAPLAN.lat, lon: KARLAPLAN.lon })).error);
});

test('travel-times function: 402 on a custom pin unless paying; Karlaplan open', { skip: SKIP }, async () => {
  type Body = { error?: string; results?: { placeId: number; minutes: number }[]; failed?: number[] };
  const call = async (token: string | null, dest: { lat: number; lon: number }, ids: object = { placeIds: [placeId] }) => {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (token) headers.authorization = `Bearer ${token}`;
    const res = await handleTravelTimes(
      new Request('http://localhost/travel-times', { method: 'POST', headers, body: JSON.stringify({ ...dest, ...ids }) }),
      {
        clients: auth => ({
          user: createClient<Database>(local!.url, local!.anon, { ...noOpts, global: { headers: auth ? { Authorization: auth } : {} } }),
          service,
        }),
      });
    return { status: res.status, body: (await res.json()) as Body };
  };

  const anonymous = await call(null, CUSTOM);
  assert.equal(anonymous.status, 402);
  assert.match(anonymous.body.error!, /Logga in/);
  const asAnonKey = await call(local!.anon, CUSTOM);   // the page's anon key is not a user
  assert.equal(asAnonKey.status, 402);
  const notPaying = await call(tokens.free, CUSTOM);
  assert.equal(notPaying.status, 402);
  assert.match(notPaying.body.error!, /Plus/);

  const pays = await call(tokens.paying, CUSTOM);
  assert.equal(pays.status, 200);
  assert.deepEqual(pays.body.results!.map(r => [r.placeId, r.minutes]), [[placeId, 19]], 'minutes from the matrix row');
  assert.deepEqual(pays.body.failed, []);
  const withNull = await call(tokens.paying, CUSTOM, { placeIds: [placeId, UNREACHABLE] });
  assert.deepEqual([withNull.body.results!.map(r => r.placeId), withNull.body.failed], [[placeId], [UNREACHABLE]], 'an unreachable place is failed, never a number');
  const elsewhere = await call(tokens.paying, { lat: 59.36, lon: 18.2 }, { placeIds: [placeId, 999999999] });
  assert.equal(elsewhere.status, 200);
  assert.deepEqual([elsewhere.body.results, elsewhere.body.failed], [[], [placeId, 999999999]], 'no row for that cell: failed');

  const open = await call(null, { lat: 59.3389, lon: 18.0907 });   // Karlaplan, anonymous
  assert.equal(open.status, 200);
  assert.deepEqual(open.body.results!.map(r => [r.placeId, r.minutes]), [[placeId, 21]]);
});
