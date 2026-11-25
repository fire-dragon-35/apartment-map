import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Circle, CircleMarker, MapContainer, Marker, Pane, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { fmt, KARLAPLAN, priceBand, PRICE_UNKNOWN, SEP, TOKENS } from '@lk/shared';
import { CAN_HOVER as HOVER } from '../../app/hover.ts';
import { hooks } from '../../app/test-hooks.ts';
import type { Listing } from '../listings/Listing.ts';
import type { Pin as Place } from '../pins/usePins.ts';
import { Popup } from './Popup.tsx';
import styles from './MapView.module.css';

const CENTRE: [number, number] = [KARLAPLAN.lat, KARLAPLAN.lon];
const esri = (layer: 'Base' | 'Reference') => `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_${layer}/MapServer/tile/{z}/{y}/{x}`;

/**
 * One pin: price colour and size; the dark ring when selected or hovered (R5).
 */
const Pin = memo(function Pin({ l, on, hot, renderer, onSelect, onHover, register }: {
  l: Listing; on: boolean; hot: boolean; renderer: L.Canvas; onSelect: (id: number) => void; onHover: (id: number | null) => void;
  register: (id: number, m: L.CircleMarker | null) => void;
}) {
  const marker = useRef<L.CircleMarker | null>(null);
  const lit = on || hot;
  const options = useMemo(() => ({
    fillColor: (priceBand(l.kpm) ?? PRICE_UNKNOWN).color, fillOpacity: lit ? 1 : 0.9,
    color: lit ? TOKENS.selected : (priceBand(l.kpm) ?? PRICE_UNKNOWN).edge, weight: lit ? 2 : 1.5, bubblingMouseEvents: false,
  }), [l.kpm, lit]);
  // the lit pin is drawn on top of its neighbours
  useEffect(() => { if (lit) marker.current?.bringToFront(); }, [lit]);
  const events = useMemo(() => HOVER
    ? { click: () => onSelect(l.id), mouseover: () => onHover(l.id), mouseout: () => onHover(null) }
    : { click: () => onSelect(l.id) }, [l.id, onSelect, onHover]);
  return (
    <>
      <CircleMarker ref={m => { marker.current = m; register(l.id, m); }} center={l.latlng} radius={l.radius} pathOptions={options} renderer={renderer}
        eventHandlers={events}>
        {HOVER && <Tooltip direction="top">{`${l.street}${SEP}${fmt.restid(l.t)}${SEP}${fmt.hyra(l.rent)}`}</Tooltip>}
      </CircleMarker>
    </>
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

/**
 * The one popup instance of the page. Leaflet owns the popup (autopan, the close button, a tap on the empty map); its
 * content is React, rendered into a node the popup holds. Closing in any way reports back through `onClose`.
 */
function SelectionPopup({ selected, today, autoPan, onClose }: { selected: Listing | null; today: string; autoPan: boolean; onClose: () => void }) {
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
    popup.options.autoPan = autoPan;
    popup.setLatLng(selected.latlng).setContent(node).openOn(map);
  }, [selected, autoPan, map, popup, node]);
  return selected ? createPortal(<Popup l={selected} today={today} />, node) : null;
}

/** A pin restid is measured to. Subscribers drag it while placing; everyone else sees a fixed dot (CORE.md: paid). */
function PlaceMarker({ place, editable, placing, onMove }: { place: Place; editable: boolean; placing: boolean; onMove: (lat: number, lon: number) => void }) {
  const icon = useMemo(() => L.divIcon({ className: styles.place, iconSize: [22, 22], html: '' }), []);
  const events = useMemo(() => ({ dragend: (e: L.DragEndEvent) => { const { lat, lng } = (e.target as L.Marker).getLatLng(); onMove(lat, lng); } }), [onMove]);
  if (!editable) {
    return (
      <CircleMarker center={[place.lat, place.lon]} radius={7} pathOptions={{ color: TOKENS.white, weight: 2, fillColor: TOKENS.accent, fillOpacity: 1 }} interactive={false}>
        <Tooltip permanent direction="right" offset={[8, 0]}>{place.label}</Tooltip>
      </CircleMarker>
    );
  }
  return (
    <Marker position={[place.lat, place.lon]} icon={icon} draggable={placing} eventHandlers={events} keyboard={false}>
      <Tooltip permanent direction="right" offset={[10, 0]}>{place.label}</Tooltip>
    </Marker>
  );
}

/** While placing the pin, the next tap anywhere on the map puts it there, as does dropping the dragged pin. */
function PlaceOnTap({ placing, onPlace }: { placing: boolean; onPlace: (lat: number, lon: number) => void }) {
  useMapEvents({ click: e => { if (placing) onPlace(e.latlng.lat, e.latlng.lng); } });
  return null;
}

/** Publishes the Leaflet map to the test hooks. */
function MapHooks() {
  const map = useMap();
  useEffect(() => { hooks.map = map; }, [map]);
  return null;
}

interface Props {
  /** the page's one loading message ("Laddar annonser…", "Räknar restider…"), shown over the map; null when idle */
  busy: string | null;
  items: Listing[];
  today: string;
  selected: Listing | null;
  /** false after a list tap: the popup opens without moving the map (R3) */
  autoPan: boolean;
  hoveredId: number | null;
  onHover: (id: number | null) => void;
  onSelect: (id: number) => void;
  onClose: () => void;
  pins: Place[];
  editablePins: boolean;
  /** "Flytta pinnen" is on: listing dots are hidden, the pin can be dragged and the next map tap or drop places it */
  placing: boolean;
  onPlace: (lat: number, lon: number) => void;
}

/** DESIGN.md §4.2 and §7: the Leaflet map with the pin, the rings, the listing dots and the popup. */
export function MapView({ busy, items, today, selected, autoPan, hoveredId, onHover, onSelect, onClose, pins, editablePins, placing, onPlace }: Props) {
  const first: [number, number] = [pins[0]!.lat, pins[0]!.lon];
  const markers = useRef(new Map<number, L.CircleMarker>());
  const register = useRef((id: number, m: L.CircleMarker | null) => { if (m) markers.current.set(id, m); else markers.current.delete(id); }).current;
  const canvas = useMemo(() => L.canvas({ pane: 'pins', tolerance: 8 }), []);
  // larger first, so smaller pins are drawn on top
  const ordered = useMemo(() => [...items].sort((a, b) => (b.m2 ?? 0) - (a.m2 ?? 0)), [items]);
  hooks.markers = markers.current;

  return (
    // placing goes on the wrapper: MapContainer reads className only once, at mount
    <div className={`${styles.wrap} ${placing ? styles.placing : ''}`}>
    <MapContainer id="map" className={styles.map} center={CENTRE} zoom={11} zoomControl={false}>
      <TileLayer url={esri('Base')} maxZoom={17} attribution="Esri, HERE, OpenStreetMap" />
      <TileLayer url={esri('Reference')} maxZoom={17} opacity={0.55} />
      {[2, 4, 6].map(km => <Circle key={km} center={first} radius={km * 1000} pathOptions={{ color: TOKENS.guide, weight: 1, dashArray: '4 4', fill: false }} interactive={false} />)}
      <PlaceOnTap placing={placing} onPlace={onPlace} />
      {pins.map(p => <PlaceMarker key={p.id ?? 'karlaplan'} place={p} editable={editablePins} placing={placing} onMove={onPlace} />)}
      {/* pins: one canvas in their own pane above the rings (SVG, not clickable), so nothing covers them */}
      <Pane name="pins" className={styles.pins}>
        {ordered.map(l => <Pin key={l.id} l={l} on={l.id === selected?.id} hot={l.id === hoveredId} renderer={canvas} onSelect={onSelect} onHover={onHover} register={register} />)}
      </Pane>
      <SelectionPopup selected={selected} today={today} autoPan={autoPan} onClose={onClose} />
      <FitOnce items={items} />
      <MapHooks />
    </MapContainer>
    {busy && <div className={styles.loading} role="status">{busy}</div>}
    </div>
  );
}
