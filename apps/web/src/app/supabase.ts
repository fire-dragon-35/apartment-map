import { createClient } from '@supabase/supabase-js';
import type { Database } from '@lk/shared';

/** The one client of the page (publishable key; row level security decides what it may read). Sign in (step 6) attaches here. */
export const supabase = createClient<Database>(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
