/**
 * The travel-times edge function (ARCHITECTURE.md §8) as a plain Request → Response function, so the function stays a
 * thin wrapper and the paywall test runs it on Node.
 *
 * POST { lat, lon, placeIds } → { results: [{ placeId, minutes }], failed: [placeId] }
 *   restid from the travel matrix, one database read. centrum is free; any other pin needs a signed in, paying user
 *   (402 otherwise). Nothing calls SL at runtime.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types.ts';
import { isCentrum } from '../domain/travel.ts';
import { destKey, MATRIX_PROFILE } from './grid.ts';
import { MatrixReader } from './matrix.ts';

type Db = SupabaseClient<Database>;

export const MAX_IDS = 300;

export interface HandlerDeps {
  /** `user` acts as the caller (checks the subscription); `service` reads the matrix. */
  clients(authorization: string | null): { user: Db; service: Db };
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
  const ids = placeIds as number[];
  const dest = { lat, lon };

  try {
    const authorization = req.headers.get('authorization');
    const { user, service } = deps.clients(authorization);
    if (!isCentrum(dest)) {
      const token = authorization?.replace(/^Bearer\s+/i, '');
      const { data } = token ? await user.auth.getUser(token) : { data: { user: null } };
      if (!data.user) return json(402, { error: 'Logga in och skaffa Plus för att välja egen plats.' });
      const { data: paying } = await user.rpc('is_paying', { uid: data.user.id });
      if (paying !== true) return json(402, { error: 'Egen plats ingår i Plus. Restid till centrum är gratis.' });
    }
    const found = await new MatrixReader(service).minutes(destKey(dest), MATRIX_PROFILE, ids);
    return json(200, {
      results: ids.filter(id => found.has(id)).map(id => ({ placeId: id, minutes: found.get(id)! })),
      failed: ids.filter(id => !found.has(id)),
    });
  } catch (e) {
    console.error('travel-times', e);
    return json(500, { error: 'Något gick fel. Försök igen.' });
  }
}
