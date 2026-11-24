import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { forwardRef, memo, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Circle, CircleMarker, MapContainer, Pane, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { fmt, KARLAPLAN, lineStyle, priceBand, PRICE_UNKNOWN, SEP, TOKENS, WALK_COLOR } from '@lk/shared';
import { hooks } from '../../app/test-hooks.ts';
import type { Listing } from '../listings/Listing.ts';
import { Popup } from './Popup.tsx';
import styles from './MapView.module.css';

const CENTRE: [number, number] = [KARLAPLAN.lat, KARLAPLAN.lon];
const REDUCED = matchMedia('(prefers-reduced-motion:reduce)').matches;
const HOVER = matchMedia('(hover:hover) and (pointer:fine)').matches;
const esri = (layer: 'Base' | 'Reference') => `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_${layer}/MapServer/tile/{z}/{y}/{x}`;

export interface MapHandle {
  /** From the list (R3): centre on the pin at zoom 14 or more, then select it. */
  focus(l: Listing): void;
}

/** One pin: price colour and size only; the dark ring only when selected (R5). */
const Pin = memo(function Pin({ l, on, renderer, onSelect, register }: {
  l: Listing; on: boolean; renderer: L.Canvas; onSelect: (id: number) => void; register: (id: number, m: L.CircleMarker | null) => void;
}) {
  const options = useMemo(() => ({
    fillColor: (priceBand(l.kpm) ?? PRICE_UNKNOWN).color, fillOpacity: 0.9,
    color: on ? TOKENS.selected : (priceBand(l.kpm) ?? PRICE_UNKNOWN).edge, weight: on ? 3 : 1.5, bubblingMouseEvents: false,
  }), [l.kpm, on]);
  return (
    <CircleMarker ref={m => register(l.id, m)} center={l.latlng} radius={l.radius} pathOptions={options} renderer={renderer}
      eventHandlers={{ click: () => onSelect(l.id) }}>
      {HOVER && <Tooltip direction="top">{`${l.street}${SEP}${fmt.restid(l.t)}${SEP}${fmt.hyra(l.rent)}`}</Tooltip>}
    </CircleMarker>
  );
});

/** Fit Karlaplan and all pins once, max zoom 14 (DESIGN.md §8). */
function FitOnce({ items }: { items: Listing[] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !items.length) return;
    done.current = true;
    map.fitBounds(L.latLngBounds([CENTRE, ...items.map(l => l.latlng)]), { padding: [24, 24], maxZoom: 14, animate: false });
  }, [items, map]);
  return null;
}

/** The selected listing's route while its popup is open and `Visa resväg` is on (R10). Not interactive, below the pins. */
function RouteLayer({ selected, show }: { selected: Listing | null; show: boolean }) {
  const map = useMap();
  const group = useMemo(() => L.layerGroup(), []);
  useEffect(() => { group.addTo(map); hooks.route = group; return () => { group.remove(); }; }, [map, group]);
  useEffect(() => {
    group.clearLayers();
    if (!selected || !show) return;
    const walk = { color: WALK_COLOR, weight: 3, dashArray: '0 8', lineCap: 'round', interactive: false } as const;
    if (!selected.legs) {
      if (selected.byFoot) L.polyline([selected.latlng, CENTRE], walk).addTo(group);
      return;
    }
    for (const [mode, line, coords] of selected.legs) {
      if (!coords || coords.length < 2) continue;
      if (mode === 'walk') { L.polyline(coords, walk).addTo(group); continue; }
      L.polyline(coords, { color: '#fff', weight: 7, opacity: 0.9, interactive: false }).addTo(group);
      L.polyline(coords, { color: lineStyle(mode, line).color, weight: 4, interactive: false }).addTo(group);
    }
  }, [selected, show, group]);
  return null;
}

/**
 * The one popup instance of the page. Leaflet owns the popup (autopan, the close button, a tap on the empty map); its
 * content is React, rendered into a node the popup holds. Closing in any way reports back through `onClose`.
 */
function SelectionPopup({ selected, today, onClose }: { selected: Listing | null; today: string; onClose: () => void }) {
  const map = useMap();
  const popup = useMemo(() => L.popup({ minWidth: 270, maxWidth: 290, autoPanPadding: [16, 16], className: styles.popup }), []);
  const node = useMemo(() => document.createElement('div'), []);
  const closed = useRef(onClose);
  closed.current = onClose;
  useEffect(() => {
    const report = () => closed.current();
    popup.on('remove', report);
    hooks.popup = popup;
    return () => { popup.off('remove', report); map.closePopup(popup); };
  }, [map, popup]);
  // layout effect: the portal below has filled `node` by now, so Leaflet measures the real content when it autopans
  useLayoutEffect(() => {
    if (!selected) { map.closePopup(popup); return; }
    popup.options.offset = L.point(0, -selected.radius);
    popup.setLatLng(selected.latlng).setContent(node).openOn(map);
  }, [selected, map, popup, node]);
  return selected ? createPortal(<Popup l={selected} today={today} />, node) : null;
}

const Controller = forwardRef<MapHandle, { onSelect: (id: number) => void }>(function Controller({ onSelect }, ref) {
  const map = useMap();
  useEffect(() => { hooks.map = map; }, [map]);
  useImperativeHandle(ref, () => ({
    focus(l) {
      map.once('moveend', () => onSelect(l.id));
      map.setView(l.latlng, Math.max(map.getZoom(), 14), { animate: !REDUCED });
    },
  }), [map, onSelect]);
  return null;
});

interface Props {
  items: Listing[];
  today: string;
  selected: Listing | null;
  showRoutes: boolean;
  onSelect: (id: number) => void;
  onClose: () => void;
}

/** DESIGN.md §4.2 and §7: the Leaflet map with Karlaplan, the rings, the pins, the popup and the route. */
export const MapView = forwardRef<MapHandle, Props>(function MapView({ items, today, selected, showRoutes, onSelect, onClose }, ref) {
  const markers = useRef(new Map<number, L.CircleMarker>());
  const register = useRef((id: number, m: L.CircleMarker | null) => { if (m) markers.current.set(id, m); else markers.current.delete(id); }).current;
  const canvas = useMemo(() => L.canvas({ pane: 'pins', tolerance: 8 }), []);
  // larger first, so smaller pins are drawn on top
  const ordered = useMemo(() => [...items].sort((a, b) => (b.m2 ?? 0) - (a.m2 ?? 0)), [items]);
  hooks.markers = markers.current;

  useEffect(() => { if (selected) markers.current.get(selected.id)?.bringToFront(); }, [selected]);

  return (
    <MapContainer id="map" className={styles.map} center={CENTRE} zoom={13} zoomControl={false}>
      <TileLayer url={esri('Base')} maxZoom={17} attribution="Esri, HERE, OpenStreetMap" />
      <TileLayer url={esri('Reference')} maxZoom={17} opacity={0.55} />
      {[2, 4, 6].map(km => <Circle key={km} center={CENTRE} radius={km * 1000} pathOptions={{ color: '#8E8E93', weight: 1, dashArray: '4 4', fill: false }} interactive={false} />)}
      <CircleMarker center={CENTRE} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: TOKENS.accent, fillOpacity: 1 }} interactive={false}>
        <Tooltip permanent direction="right" offset={[8, 0]}>Karlaplan</Tooltip>
      </CircleMarker>
      {/* pins: one canvas in their own pane above rings and routes (SVG, not clickable), so nothing covers them */}
      <Pane name="pins" className={styles.pins}>
        {ordered.map(l => <Pin key={l.id} l={l} on={l.id === selected?.id} renderer={canvas} onSelect={onSelect} register={register} />)}
      </Pane>
      <RouteLayer selected={selected} show={showRoutes} />
      <SelectionPopup selected={selected} today={today} onClose={onClose} />
      <FitOnce items={items} />
      <Controller ref={ref} onSelect={onSelect} />
    </MapContainer>
  );
});
