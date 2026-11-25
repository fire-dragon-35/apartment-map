/**
 * The page's one read of Supabase: PostgREST over plain fetch (publishable key; row level security decides what it
 * may read). No client library: it would be half the page's JavaScript for one GET. Sign in (step 6) attaches here.
 */
const BASE = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function rest<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!res.ok) throw new Error((await res.json().catch(() => null) as { message?: string } | null)?.message ?? `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}
