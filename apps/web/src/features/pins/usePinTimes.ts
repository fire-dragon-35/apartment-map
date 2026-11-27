import { useCallback, useEffect, useState } from 'react';
import { useSupabase } from '@frame/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isKarlaplan } from '@lk/shared';
import { pinKey, type Pin } from './usePins.ts';

const CHUNK = 300;   // the travel-times function takes at most 300 places per call
/** per page load, successes only: pin → place id → minutes (from the travel matrix) */
const cache = new Map<string, Map<number, number>>();

async function fetchMinutes(client: SupabaseClient, pin: Pin, placeIds: number[]): Promise<Map<number, number>> {
  const found = new Map<number, number>();
  const chunks = Array.from({ length: Math.ceil(placeIds.length / CHUNK) }, (_, i) => placeIds.slice(i * CHUNK, (i + 1) * CHUNK));
  await Promise.all(chunks.map(async ids => {
    const { data, error } = await client.functions.invoke<{ results: { placeId: number; minutes: number }[] }>('travel-times', { body: { lat: pin.lat, lon: pin.lon, placeIds: ids } });
    if (error) throw error;
    for (const r of data?.results ?? []) found.set(r.placeId, r.minutes);
  }));
  return found;
}

/**
 * restid from every place to the user's own pin (Karlaplan's comes with the listings). The travel-times edge function
 * answers from the matrix in a few fast parallel calls; the answer is kept for the page load. `ready` is false while
 * loading and after an error, and then the page keeps Karlaplan's times and shows `error`.
 */
export function usePinTimes(pin: Pin | null, placeIds: number[]) {
  const client = useSupabase();
  const key = pin && !isKarlaplan(pin) ? pinKey(pin) : null;
  const [failed, setFailed] = useState<{ key: string; message: string } | null>(null);
  const [, setArrived] = useState(0);

  useEffect(() => {
    if (!key || !pin || !placeIds.length || cache.has(key)) return;
    let alive = true;
    fetchMinutes(client, pin, placeIds).then(found => {
      if (!found.size) throw new Error('empty');
      cache.set(key, found);
      if (alive) setArrived(n => n + 1);
    }).catch((e: unknown) => {
      if (!alive) return;
      const message = e instanceof Error && e.message === 'empty'
        ? 'Inga restider till den platsen. Välj en plats inom 20 km från centrum.'
        : 'Kunde inte räkna restider till din plats just nu. Visar restid till centrum.';
      setFailed({ key, message });
    });
    return () => { alive = false; };
    // the pin is named by `key`
  }, [key, placeIds, client]);

  const found = key ? cache.get(key) : undefined;
  const minutes = useCallback((placeId: number) => found?.get(placeId) ?? null, [found]);
  const error = key && failed?.key === key ? failed.message : null;
  return { minutes, ready: !!found, loading: !!key && !found && !error, error };
}
