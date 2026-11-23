import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { passesFilters, type PageFilters } from '@lk/shared';
import { Header } from './components/Header.tsx';
import { Legend } from './components/Legend.tsx';
import { ListView } from './components/ListView.tsx';
import { MapView, type MapHandle } from './components/MapView.tsx';
import { useListings } from './data/useListings.ts';
import type { Listing } from './domain/Listing.ts';
import { useFilters, useRouteToggle } from './state/useFilters.ts';
import { hooks } from './test-hooks.ts';

const REDUCED = matchMedia('(prefers-reduced-motion:reduce)').matches;

export default function App() {
  const { listings, today, loaded, error } = useListings();
  const [filters, setFilters] = useFilters();
  const [routes, setRoutes] = useRouteToggle();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const map = useRef<MapHandle>(null);
  const selectedRef = useRef<number | null>(null);
  selectedRef.current = selectedId;

  // R8: the "nya" count is within the other filters; "Bara nya" only narrows the list
  const { visible, newCount } = useMemo(() => {
    const base = listings.filter(l => passesFilters(l, filters));
    return {
      newCount: base.filter(l => l.isNew).length,
      visible: base.filter(l => !filters.onlyNew || l.isNew).sort((a, b) => a.t - b.t || (a.rent ?? 0) - (b.rent ?? 0)),
    };
  }, [listings, filters]);
  const selected = useMemo(() => visible.find(l => l.id === selectedId) ?? null, [visible, selectedId]);

  /** A filter change refilters, closes the popup and keeps the map where it is. */
  const changeFilters = useCallback((change: Partial<PageFilters>) => { setSelectedId(null); setFilters(change); }, [setFilters]);
  const close = useCallback(() => setSelectedId(null), []);
  const select = useCallback((id: number) => setSelectedId(id), []);

  /** R3: a card tap scrolls to the top and brings the map to the pin; the selected card again closes. */
  const pick = useCallback((l: Listing) => {
    if (l.id === selectedRef.current) { setSelectedId(null); return; }
    scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' });
    map.current?.focus(l);
  }, []);

  useEffect(() => {   // R4: Esc
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedId(null); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  if (import.meta.env.MODE === 'test') Object.assign(hooks, { all: listings, visible, selectedId, today });

  return (
    <>
      <Header filters={filters} onFilters={changeFilters} routes={routes} onRoutes={setRoutes} shown={visible.length} newCount={newCount} loaded={loaded} error={error} />
      <MapView ref={map} items={visible} today={today} selected={selected} showRoutes={routes} onSelect={select} onClose={close} />
      <Legend />
      <ListView items={visible} today={today} selectedId={selected?.id ?? null} onPick={pick} error={error} />
    </>
  );
}
