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
          <span className={styles.toggle}>
            <svg className={styles.icon} viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              <path d="M3 5.5h8M15 5.5h2M3 14.5h2M9 14.5h8" /><circle cx="13" cy="5.5" r="2" /><circle cx="7" cy="14.5" r="2" />
            </svg>
            Filter
          </span>
        </summary>
        <div className={styles.filters}>
          <RangeSlider single idLow="f-min-lo" idHigh="f-min" label="Max restid" {...SLIDERS.min} low={SLIDERS.min.min} high={filters.min}
            format={(_, hi) => fmt.upTo(hi, SLIDERS.min.max, 'min')} onChange={(_, min) => onFilters({ min })} />
          <RangeSlider single idLow="f-rent-lo" idHigh="f-rent" label="Max hyra" {...SLIDERS.rent} low={SLIDERS.rent.min} high={filters.rent}
            format={(_, hi) => fmt.upTo(hi, SLIDERS.rent.max, 'kr', fmt.kilo)} onChange={(_, rent) => onFilters({ rent })} />
          <RangeSlider single idLow="f-kpm-lo" idHigh="f-kpm" label="Max kr/m²" {...SLIDERS.kpm} low={SLIDERS.kpm.min} high={filters.kpm}
            format={(_, hi) => fmt.upTo(hi, SLIDERS.kpm.max, 'kr/m²')} onChange={(_, kpm) => onFilters({ kpm })} />
          <RangeSlider idLow="f-m2" idHigh="f-m2max" label="Storlek" {...SLIDERS.m2} low={filters.m2} high={filters.m2Max}
            format={(lo, hi) => fmt.range(lo, hi, SLIDERS.m2.max, 'm²')} onChange={(m2, m2Max) => onFilters({ m2, m2Max })} />
          <RangeSlider idLow="f-rooms" idHigh="f-roomsmax" label="Antal rum" {...SLIDERS.rooms} low={filters.rooms} high={filters.roomsMax}
            format={(lo, hi) => fmt.range(lo, hi, SLIDERS.rooms.max, 'rum', fmt.rooms)} onChange={(rooms, roomsMax) => onFilters({ rooms, roomsMax })} />
          <div className={styles.footer}>
            <div className={styles.checks}>
              <Checkbox id="f-new" label="Bara nya" checked={filters.onlyNew} onChange={e => onFilters({ onlyNew: e.target.checked })} />
              <Checkbox id="f-route" label="Visa resväg" checked={routes} onChange={e => onRoutes(e.target.checked)} />
            </div>
            <Button type="button" variant="secondary" disabled={isDefault(filters)} onClick={() => onFilters(DEFAULT_FILTERS)}>Återställ</Button>
          </div>
        </div>
      </details>
    </Stack>
  );
}
