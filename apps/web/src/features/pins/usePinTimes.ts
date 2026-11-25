import { useCallback, useEffect, useState } from 'react';
import { useSupabase } from '@frame/supabase';
import { isKarlaplan } from '@lk/shared';
import { pinKey, type Pin } from './usePins.ts';

const CHUNK = 300;   // the travel-times function takes at most 300 places per call
/** per page load: pin → place id → minutes (from the travel matrix) */
const cache = new Map<string, Map<number, number>>();

/**
 * restid from every place to each custom pin (Karlaplan's comes with the listings). The travel-times edge function
 * answers from the matrix, so a pin costs a few fast calls, made in parallel; the answer is kept for the page load.
 */
export function usePinTimes(pins: Pin[], placeIds: number[]) {
  const client = useSupabase();
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const wanted = pins.filter(p => !isKarlaplan(p) && !cache.has(pinKey(p)));
  const want = wanted.map(pinKey).join('|');

  useEffect(() => {
    if (!wanted.length || !placeIds.length) return;
    let alive = true;
    setLoading(true);
    void Promise.all(wanted.map(async pin => {
      const found = new Map<number, number>();
      const chunks = Array.from({ length: Math.ceil(placeIds.length / CHUNK) }, (_, i) => placeIds.slice(i * CHUNK, (i + 1) * CHUNK));
      await Promise.all(chunks.map(async ids => {
        const { data } = await client.functions.invoke<{ results: { placeId: number; minutes: number }[] }>('travel-times', { body: { lat: pin.lat, lon: pin.lon, placeIds: ids } });
        for (const r of data?.results ?? []) found.set(r.placeId, r.minutes);
      }));
      cache.set(pinKey(pin), found);
    })).finally(() => { if (alive) { setLoading(false); setVersion(v => v + 1); } });
    return () => { alive = false; };
  }, [want, placeIds.length, client]);

  // a new function whenever new minutes arrive, so memos that use it recompute
  const minutes = useCallback((pin: Pin, placeId: number) => cache.get(pinKey(pin))?.get(placeId) ?? null, [version]);
  return { minutes, loading };
}
