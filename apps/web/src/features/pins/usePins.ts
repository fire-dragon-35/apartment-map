import { useCallback, useEffect, useState } from 'react';
import { useAuth, useSubscription, useSupabase } from '@frame/supabase';
import { isKarlaplan, KARLAPLAN } from '@lk/shared';

/** A place restid is measured to. `id` null = Karlaplan as the free default (not stored). */
export interface Pin { id: number | null; label: string; lat: number; lon: number }

export const KARLAPLAN_PIN: Pin = { id: null, label: 'Karlaplan', lat: KARLAPLAN.lat, lon: KARLAPLAN.lon };
export const MAX_PINS = 3;
export const pinKey = (p: { lat: number; lon: number }) => `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`;
export const isDefault = (pins: Pin[]) => pins.length === 1 && isKarlaplan(pins[0]!);
const round = (n: number) => Math.round(n * 1e4) / 1e4;

/**
 * The user's pins (table destinations; RLS lets only paying users store other places than Karlaplan). Free users and
 * paying users without own pins get Karlaplan. Editing is for paying users only (`canEdit`).
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

  const pins = canEdit && stored.length ? stored : [KARLAPLAN_PIN];

  /** writes, then reloads; the database's answer is the truth (RLS, the 3 pin limit) */
  const run = useCallback(async (write: () => PromiseLike<{ error: { message: string } | null }>) => {
    setError(null);
    const { error: e } = await write();
    if (e) setError(e.message);
    await load();
  }, [load]);

  const add = useCallback((lat: number, lon: number) => run(async () => {
    const rows = stored.length ? [] : [{ user_id: user!.id, label: KARLAPLAN_PIN.label, lat: KARLAPLAN.lat, lon: KARLAPLAN.lon }];
    const used = new Set(pins.map(p => p.label));
    const label = ['A', 'B', 'C'].find(l => !used.has(l)) ?? 'Plats';
    return client.from('destinations').insert([...rows, { user_id: user!.id, label, lat: round(lat), lon: round(lon) }]);
  }), [run, stored.length, pins, client, user]);

  const move = useCallback((pin: Pin, lat: number, lon: number) => run(async () => pin.id === null
    ? client.from('destinations').insert({ user_id: user!.id, label: pin.label, lat: round(lat), lon: round(lon) })
    : client.from('destinations').update({ lat: round(lat), lon: round(lon) }).eq('id', pin.id)), [run, client, user]);

  const remove = useCallback((pin: Pin) => run(async () => client.from('destinations').delete().eq('id', pin.id!)), [run, client]);

  return { pins, canEdit, signedIn: !!user, error, add, move, remove };
}
