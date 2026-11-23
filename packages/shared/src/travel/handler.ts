/**
 * The logic of the travel-times edge function (ARCHITECTURE.md §8), as a plain Request → Response function so the
 * function stays a thin wrapper and the Paywall test can run it on Node against local Supabase.
 *
 * POST { lat, lon, placeIds } → { results: [{ placeId, minutes, walkMin, transitMin, legs }], failed: [placeId] }
 * Karlaplan's cell is open to everyone; any other destination needs a signed in, paying user (402 otherwise).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.ts';
import { isKarlaplan } from '../domain/travel.ts';
import { SupabaseTravelCache } from './cache.ts';
import { TravelTimeService } from './service.ts';

type Db = SupabaseClient<Database>;

export const MAX_IDS = 300;

export interface HandlerDeps {
  /** `user` acts as the caller (row level security applies); `service` writes the cache. */
  clients(authorization: string | null): { user: Db; service: Db };
  fetch: typeof fetch;
  now?: () => Date;
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

export async function handleTravelTimes(req: Request, deps: HandlerDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'POST krävs' });

  let body: { lat?: unknown; lon?: unknown; placeIds?: unknown };
  try { body = await req.json(); } catch { return json(400, { error: 'Ogiltig JSON' }); }
  const { lat, lon, placeIds } = body;
  if (!finite(lat) || !finite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return json(400, { error: 'lat och lon krävs' });
  if (!Array.isArray(placeIds) || !placeIds.length || placeIds.length > MAX_IDS || !placeIds.every(Number.isInteger)) {
    return json(400, { error: `placeIds: 1 till ${MAX_IDS} id` });
  }
  const dest = { lat, lon };

  try {
    const authorization = req.headers.get('authorization');
    const { user, service } = deps.clients(authorization);

    if (!isKarlaplan(dest)) {
      const token = authorization?.replace(/^Bearer\s+/i, '');
      const { data } = token ? await user.auth.getUser(token) : { data: { user: null } };
      if (!data.user) return json(402, { error: 'Logga in och skaffa en prenumeration för att välja egen plats.' });
      const { data: paying } = await user.rpc('is_paying', { uid: data.user.id });
      if (paying !== true) return json(402, { error: 'Egna platser ingår i prenumerationen. Karlaplan är gratis.' });
    }

    const { data: places, error } = await user.from('places').select('id, lat, lon').in('id', placeIds as number[]);
    if (error) throw new Error(error.message);
    const known = places.map(p => ({ id: p.id, lat: Number(p.lat), lon: Number(p.lon) }));

    const service_ = new TravelTimeService({ fetch: deps.fetch, cache: new SupabaseTravelCache(user, service), now: deps.now ?? (() => new Date()) });
    const outcome = await service_.compute(known, dest);
    const unknown = (placeIds as number[]).filter(id => !known.some(p => p.id === id));
    return json(200, {
      results: outcome.results.map(r => ({ placeId: r.placeId, minutes: r.minutes, walkMin: r.walkMin, transitMin: r.transitMin, legs: r.legs })),
      failed: [...outcome.failed, ...unknown],
    });
  } catch (e) {
    console.error('travel-times', e);
    return json(500, { error: 'Något gick fel. Försök igen.' });
  }
}
