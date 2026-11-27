import { useCallback, useEffect, useState } from 'react';
import { useAuth, useSubscription, useSupabase } from '@frame/supabase';

/**
 * Plus: the listings the user has checked off (seen, not interested, applied), table `listing_marks`. A toggle shows
 * at once and is undone if the database refuses it. Without Plus there are none and nothing can be added.
 */
export function useMarks() {
  const client = useSupabase();
  const { user } = useAuth();
  const { active } = useSubscription();
  const [marked, setMarked] = useState<ReadonlySet<number>>(new Set());

  useEffect(() => {
    if (!user || !active) { setMarked(new Set()); return; }
    void client.from('listing_marks').select('listing_id').eq('user_id', user.id)
      .then(({ data }) => setMarked(new Set((data ?? []).map(r => r.listing_id))));
  }, [client, user, active]);

  const flip = (s: ReadonlySet<number>, id: number) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; };

  const toggle = useCallback(async (id: number) => {
    if (!user) return;
    const done = marked.has(id);
    setMarked(s => flip(s, id));
    const { error } = done
      ? await client.from('listing_marks').delete().eq('user_id', user.id).eq('listing_id', id)
      : await client.from('listing_marks').insert({ user_id: user.id, listing_id: id });
    if (error) setMarked(s => flip(s, id));
  }, [client, user, marked]);

  return { marked, canMark: !!user && active, toggle };
}
