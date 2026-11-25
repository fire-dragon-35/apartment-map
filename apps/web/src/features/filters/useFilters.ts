import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_FILTERS, SLIDERS, type PageFilters } from '@lk/shared';

const KEY = 'lgh-filters';
const NUM = ['min', 'rent', 'm2', 'm2Max', 'rooms', 'roomsMax'] as const;
const RANGE: Record<(typeof NUM)[number], { min: number; max: number }> = {
  min: SLIDERS.min, rent: SLIDERS.rent, m2: SLIDERS.m2, m2Max: SLIDERS.m2, rooms: SLIDERS.rooms, roomsMax: SLIDERS.rooms,
};
type NumKey = (typeof NUM)[number];
const clamp = (v: number, { min, max }: { min: number; max: number }) => Math.min(max, Math.max(min, v));

function read(): PageFilters {
  let remembered: Partial<PageFilters> = {};
  try { remembered = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<PageFilters>; } catch { /* private mode */ }
  const q = new URLSearchParams(location.search);
  const pick = (name: NumKey): number => {
    const v = Number(q.get(name) ?? remembered[name]);
    return Number.isFinite(v) && (q.has(name) || remembered[name] !== undefined) ? clamp(v, RANGE[name]) : DEFAULT_FILTERS[name];
  };
  return { min: pick('min'), rent: pick('rent'), m2: pick('m2'), m2Max: pick('m2Max'), rooms: pick('rooms'), roomsMax: pick('roomsMax'), onlyNew: q.get('new') === '1' };
}

/**
 * The filter state. The URL query is the shareable truth (?min=25&rent=15000&m2=30&m2Max=50&rooms=2&roomsMax=3&new=1, only what differs from the
 * defaults); the sliders are also remembered in the browser as before. "Bara nya" is never remembered.
 */
export function useFilters(): [PageFilters, (change: Partial<PageFilters>) => void] {
  const [filters, setFilters] = useState(read);
  // written once the sliders rest: a drag fires dozens of changes, and Safari throws after 100 replaceState calls in 30 s
  useEffect(() => {
    const t = setTimeout(() => {
      const q = new URLSearchParams();
      for (const k of NUM) if (filters[k] !== DEFAULT_FILTERS[k]) q.set(k, String(filters[k]));
      if (filters.onlyNew) q.set('new', '1');
      history.replaceState(null, '', q.size ? `?${q}` : location.pathname);
      try { localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(NUM.map(k => [k, filters[k]])))); } catch { /* private mode */ }
    }, 300);
    return () => clearTimeout(t);
  }, [filters]);
  return [filters, useCallback((change: Partial<PageFilters>) => setFilters(old => ({ ...old, ...change })), [])];
}

const ROUTES_KEY = 'lgh-routes';

/** `Visa resväg`: on by default, remembered. */
export function useRouteToggle(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(() => { try { return localStorage.getItem(ROUTES_KEY) !== '0'; } catch { return true; } });
  return [on, useCallback((v: boolean) => { setOn(v); try { localStorage.setItem(ROUTES_KEY, v ? '1' : '0'); } catch { /* private mode */ } }, [])];
}
