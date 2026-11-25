import { Page, Panel } from '@frame/core';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { isKarlaplan, passesFilters, type PageFilters } from '@lk/shared';
import { Header } from '../features/filters/Header.tsx';
import { useFilters, useRouteToggle } from '../features/filters/useFilters.ts';
import type { Listing } from '../features/listings/Listing.ts';
import { ListView } from '../features/listings/ListView.tsx';
import { SortBar } from '../features/listings/SortBar.tsx';
import { DEFAULT_SORT, sortListings, type SortState } from '../features/listings/sort.ts';
import { useListings } from '../features/listings/useListings.ts';
import { Legend } from '../features/map/Legend.tsx';
import { MapView } from '../features/map/MapView.tsx';
import { PinBar } from '../features/pins/PinBar.tsx';
import { isDefault, usePins } from '../features/pins/usePins.ts';
import { usePinTimes } from '../features/pins/usePinTimes.ts';
import { useSavedSearch } from '../features/pins/useSavedSearch.ts';
import { hooks } from './test-hooks.ts';

/** The map page (DESIGN.md §12): state lives here, the features only render and report. */
export function MapPage() {
  const { listings: base0, today, loaded, error } = useListings();
  const [filters, setFilters] = useFilters();
  // paid (CORE.md): own pins, a saved search with a daily email; free: Karlaplan
  const { pins, canEdit, signedIn, error: pinError, add, move, remove } = usePins();
  const [adding, setAdding] = useState(false);
  const placeIds = useMemo(() => [...new Set(base0.map(l => l.placeId))], [base0]);
  const { minutes, loading: timesLoading } = usePinTimes(isDefault(pins) ? [] : pins, placeIds);
  const { saved, save, error: saveError } = useSavedSearch();
  const listings = useMemo(() => isDefault(pins) ? base0 : base0.map(l => l.forPins(pins.map(p => isKarlaplan(p)
    ? { label: p.label, minutes: l.t, approx: false }
    : { label: p.label, minutes: minutes(p, l.placeId), approx: true }))),
    [base0, pins, minutes]);
  // a saved search fills the filters once, when the page opens without filters of its own
  const applied = useRef(false);
  useEffect(() => {
    if (applied.current || !saved) return;
    applied.current = true;
    if (!location.search) setFilters(saved.filters);
  }, [saved, setFilters]);
  const addPin = useCallback((lat: number, lon: number) => { setAdding(false); void add(lat, lon); }, [add]);
  const [routes, setRoutes] = useRouteToggle();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  /** the listing under the pointer, in the list or on the map: the other side lights up too */
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  /** false after a list tap: the popup opens without panning the map (R3) */
  const [autoPan, setAutoPan] = useState(true);
  const selectedRef = useRef<number | null>(null);
  selectedRef.current = selectedId;

  // the sliders move at once; the list and the map follow when React has time (a drag never stutters)
  const shownFilters = useDeferredValue(filters);
  const shownSort = useDeferredValue(sort);
  // R8: the "nya" count is within the other filters; "Bara nya" only narrows the list
  const { visible, newCount } = useMemo(() => {
    const base = listings.filter(l => passesFilters(l, shownFilters));
    return {
      newCount: base.filter(l => l.isNew).length,
      visible: sortListings(base.filter(l => !shownFilters.onlyNew || l.isNew), shownSort),
    };
  }, [listings, shownFilters, shownSort]);
  const selected = useMemo(() => visible.find(l => l.id === selectedId) ?? null, [visible, selectedId]);

  /** A filter change refilters, closes the popup and keeps the map where it is. */
  const changeFilters = useCallback((change: Partial<PageFilters>) => { setSelectedId(null); setFilters(change); }, [setFilters]);
  const close = useCallback(() => setSelectedId(null), []);
  const select = useCallback((id: number) => { setAutoPan(true); setSelectedId(id); }, []);

  /** R3: a card tap selects the listing (outline, route, popup) and leaves the page and the map where they are; the selected card again closes. */
  const pick = useCallback((l: Listing) => {
    if (l.id === selectedRef.current) { setSelectedId(null); return; }
    setAutoPan(false);
    setSelectedId(l.id);
  }, []);

  useEffect(() => {   // R4: Esc
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedId(null); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);

  if (import.meta.env.MODE === 'test') Object.assign(hooks, { all: listings, visible, selectedId, today });

  return (
    <Page>
      <Page.Header>
        <Header filters={filters} onFilters={changeFilters} routes={routes} onRoutes={setRoutes}
          shown={visible.length} newCount={newCount} loaded={loaded} error={error} />
      </Page.Header>
      <Page.Content>
        <PinBar pins={pins} canEdit={canEdit} signedIn={signedIn} adding={adding} onAdding={setAdding} onRemove={p => void remove(p)}
          alerts={saved?.alerts ?? false} onSave={a => void save(filters, a)} saved={!!saved} loading={timesLoading} error={pinError ?? saveError} />
        <Panel flush aria-label="Karta">
          <MapView pins={pins} editablePins={canEdit} adding={adding} onAddPin={addPin} onMovePin={(p, la, lo) => void move(p, la, lo)} loaded={loaded} items={visible} today={today} selected={selected} autoPan={autoPan} showRoutes={routes} hoveredId={hoveredId} onHover={setHoveredId} onSelect={select} onClose={close} />
        </Panel>
        <Legend />
        <Panel flush aria-label="Annonser">
          <SortBar sort={sort} onSort={setSort} />
          <ListView items={visible} today={today} selectedId={selected?.id ?? null} hoveredId={hoveredId} onPick={pick} onHover={setHoveredId} error={error} loaded={loaded} />
        </Panel>
      </Page.Content>
    </Page>
  );
}
