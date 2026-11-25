import { useCallback, useEffect, useState } from 'react';
import { useAuth, useSubscription, useSupabase } from '@frame/supabase';
import type { PageFilters } from '@lk/shared';

/** The user's one saved search (paid): the filters, and whether a daily email goes out for new matches. */
export function useSavedSearch() {
  const client = useSupabase();
  const { user } = useAuth();
  const { active } = useSubscription();
  const [saved, setSaved] = useState<{ filters: Partial<PageFilters>; alerts: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !active) { setSaved(null); return; }
    void client.from('saved_searches').select('filters, alerts').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setSaved(data ? { filters: data.filters as Partial<PageFilters>, alerts: data.alerts } : null));
  }, [client, user, active]);

  const save = useCallback(async (filters: PageFilters, alerts: boolean) => {
    if (!user) return;
    const kept: Partial<PageFilters> = { ...filters };
    delete kept.onlyNew;   // "Bara nya" is a view, not part of the search
    const { error: e } = await client.from('saved_searches').upsert({ user_id: user.id, filters: kept, alerts }, { onConflict: 'user_id' });
    setError(e?.message ?? null);
    if (!e) setSaved({ filters: kept, alerts });
  }, [client, user]);

  return { saved, save, error };
}
