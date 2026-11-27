import { useCallback, useEffect, useState } from 'react';
import { useAuth, useSubscription, useSupabase } from '@frame/supabase';
import { isCentrum, CENTRUM } from '@lk/shared';

/** A place restid is measured to. `id` null = centrum as the free default (not stored). */
export interface Pin { id: number | null; label: string; lat: number; lon: number }

export const CENTRUM_PIN: Pin = { id: null, label: 'Centrum', lat: CENTRUM.lat, lon: CENTRUM.lon };
export const OWN_LABEL = 'Din plats';
export const pinKey = (p: { lat: number; lon: number }) => `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`;
export const isDefault = (pins: Pin[]) => pins.length === 1 && isCentrum(pins[0]!);
const round = (n: number) => Math.round(n * 1e4) / 1e4;

/**
 * The one pin restid is measured to (CORE.md): centrum, or for paying users their own place (table destinations,
 * at most one row; RLS lets only paying users store another place than centrum).
 */
export function usePins() {
  const client = useSupabase();
  const { user } = useAuth();
  const { active } = useSubscription();
  const [stored, setStored] = useState<Pin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const canEdit = !!user && active;

  const load = useCallback(async () => {
    if (!canEdit) { setStored([]); return; }
    const { data, error: e } = await client.from('destinations').select('id, label, lat, lon').order('id');
    if (e) { setError(e.message); return; }
    setStored((data ?? []).map(d => ({ id: d.id, label: d.label ?? 'Plats', lat: Number(d.lat), lon: Number(d.lon) })));
  }, [client, canEdit]);
  useEffect(() => { void load(); }, [load]);

  const pins = canEdit && stored.length ? stored : [CENTRUM_PIN];

  /** writes, then reloads; the database's answer is the truth (RLS, the 3 pin limit) */
  const run = useCallback(async (write: () => PromiseLike<{ error: { message: string } | null }>) => {
    setError(null);
    const { error: e } = await write();
    if (e) setError(e.message);
    await load();
  }, [load]);

  /** the one pin: moving centrum stores it as the user's own place, moving that updates it */
  const move = useCallback((pin: Pin, lat: number, lon: number) => run(async () => pin.id === null
    ? client.from('destinations').insert({ user_id: user!.id, label: OWN_LABEL, lat: round(lat), lon: round(lon) })
    : client.from('destinations').update({ lat: round(lat), lon: round(lon) }).eq('id', pin.id)), [run, client, user]);

  /** back to centrum */
  const reset = useCallback(() => run(async () => client.from('destinations').delete().eq('user_id', user!.id)), [run, client, user]);

  return { pins, canEdit, error, move, reset };
}
