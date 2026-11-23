// ARCHITECTURE.md §8. All logic is in packages/shared/src/travel (the worker uses the same service); this only wires Deno to it.
import { createClient } from '@supabase/supabase-js';
import { handleTravelTimes } from '../../../packages/shared/src/travel/handler.ts';

const url = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const options = { auth: { persistSession: false, autoRefreshToken: false } };

Deno.serve(req => handleTravelTimes(req, {
  fetch,
  clients: authorization => ({
    // acts as the caller, so row level security applies to every read
    user: createClient(url, anonKey, { ...options, global: { headers: authorization ? { Authorization: authorization } : {} } }),
    service: createClient(url, serviceKey, options),
  }),
}));
