import { useEffect, useRef } from 'react';
import { Stack } from '@frame/core';
import { Button, Checkbox, Text } from '@frame/ui';
import { DEFAULT_FILTERS, fmt, SEP, SLIDERS, type PageFilters } from '@lk/shared';
import { RangeSlider } from './RangeSlider.tsx';
import styles from './Header.module.css';

interface Props {
  filters: PageFilters;
  onFilters: (change: Partial<PageFilters>) => void;
  routes: boolean;
  onRoutes: (on: boolean) => void;
  shown: number;
  newCount: number;
  loaded: boolean;
  error: Error | null;
}

const isDefault = (f: PageFilters) => (Object.keys(DEFAULT_FILTERS) as (keyof PageFilters)[]).every(k => f[k] === DEFAULT_FILTERS[k]);

/** DESIGN.md §4.1: title, meta line, the Filter popover and `Visa resväg`. */
export function Header({ filters, onFilters, routes, onRoutes, shown, newCount, loaded, error }: Props) {
  const details = useRef<HTMLDetailsElement>(null);
  // the panel floats over the page: close it on a click outside or Escape
  useEffect(() => {
    const close = (e: Event) => {
      const d = details.current;
      if (d?.open && (e instanceof KeyboardEvent ? e.key === 'Escape' : !d.contains(e.target as Node))) d.open = false;
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close); };
  }, []);
  return (
    <Stack gap={2}>
      <h1>Lägenheter nära Karlaplan</h1>
      <Text as="p" size="xs" tone="muted">
        {error ? 'Kunde inte ladda' : loaded && <>{fmt.traffar(shown)}{SEP}<span id="nya">{fmt.nya(newCount)}</span>{(summary => summary && <>{SEP}{summary}</>)(fmt.filterSummary(filters))}</>}
      </Text>
      <details className={styles.details} ref={details}>
        <summary className={styles.summary}>
          <span className={styles.toggle}>Filter</span>
          <Checkbox id="f-route" label="Visa resväg" checked={routes} onChange={e => onRoutes(e.target.checked)} />
        </summary>
        <div className={styles.filters}>
          <RangeSlider single idLow="f-min-lo" idHigh="f-min" label="Max restid" {...SLIDERS.min} low={SLIDERS.min.min} high={filters.min}
            format={(_, hi) => fmt.upTo(hi, SLIDERS.min.max, 'min')} onChange={(_, min) => onFilters({ min })} />
          <RangeSlider single idLow="f-rent-lo" idHigh="f-rent" label="Max hyra" {...SLIDERS.rent} low={SLIDERS.rent.min} high={filters.rent}
            format={(_, hi) => fmt.upTo(hi, SLIDERS.rent.max, 'kr', fmt.kilo)} onChange={(_, rent) => onFilters({ rent })} />
          <RangeSlider idLow="f-m2" idHigh="f-m2max" label="Storlek" {...SLIDERS.m2} low={filters.m2} high={filters.m2Max}
            format={(lo, hi) => fmt.range(lo, hi, SLIDERS.m2.max, 'm²')} onChange={(m2, m2Max) => onFilters({ m2, m2Max })} />
          <RangeSlider idLow="f-rooms" idHigh="f-roomsmax" label="Antal rum" {...SLIDERS.rooms} low={filters.rooms} high={filters.roomsMax}
            format={(lo, hi) => fmt.range(lo, hi, SLIDERS.rooms.max, 'rum', fmt.rooms)} onChange={(rooms, roomsMax) => onFilters({ rooms, roomsMax })} />
          <div className={styles.footer}>
            <Checkbox id="f-new" label="Bara nya" checked={filters.onlyNew} onChange={e => onFilters({ onlyNew: e.target.checked })} />
            <Button type="button" variant="secondary" disabled={isDefault(filters)} onClick={() => onFilters(DEFAULT_FILTERS)}>Återställ</Button>
          </div>
        </div>
      </details>
    </Stack>
  );
}
