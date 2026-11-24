import { Grid, Stack } from '@frame/core';
import { Checkbox } from '@frame/ui';
import { fmt, SEP, SLIDERS, type PageFilters } from '@lk/shared';
import text from '../../app/text.module.css';
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

interface SliderProps {
  id: 'min' | 'rent' | 'm2';
  label: string;
  value: number;
  show: (v: number) => string;
  onChange: (v: number) => void;
}

/** One filter row: label 3, slider 6, value 3 columns (DESIGN.md §12). */
function Slider({ id, label, value, show, onChange }: SliderProps) {
  const { min, max, step } = SLIDERS[id];
  return (
    <Grid gap={2}>
      <Grid.Item span={3}><label htmlFor={`f-${id}`} className={text.t3}>{label}</label></Grid.Item>
      <Grid.Item span={6}>
        <input id={`f-${id}`} className={styles.range} type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))} />
      </Grid.Item>
      <Grid.Item span={3}><output htmlFor={`f-${id}`} className={`${styles.value} ${text.t2}`}>{show(value)}</output></Grid.Item>
    </Grid>
  );
}

/** DESIGN.md §4.1: title, meta line, the Filter <details> and `Visa resväg`. */
export function Header({ filters, onFilters, routes, onRoutes, shown, newCount, loaded, error }: Props) {
  return (
    <Stack gap={2}>
      <h1>Lägenheter nära Karlaplan</h1>
      <p className={`${styles.meta} ${text.t3}`}>
        {error ? 'Kunde inte ladda' : loaded && <>{fmt.traffar(shown)}{SEP}<span id="nya">{fmt.nya(newCount)}</span>{SEP}{fmt.filterSummary(filters)}</>}
      </p>
      <Grid gap={4}>
        <Grid.Item span={8}>
          <details>
            <summary className={styles.summary}>Filter</summary>
            <Stack gap={2} className={styles.filters}>
              <Slider id="min" label="Restid" value={filters.min} show={fmt.sliderMin} onChange={min => onFilters({ min })} />
              <Slider id="rent" label="Hyra" value={filters.rent} show={fmt.sliderRent} onChange={rent => onFilters({ rent })} />
              <Slider id="m2" label="Storlek" value={filters.m2} show={fmt.sliderM2} onChange={m2 => onFilters({ m2 })} />
              <Checkbox id="f-new" label="Bara nya" checked={filters.onlyNew} onChange={e => onFilters({ onlyNew: e.target.checked })} />
            </Stack>
          </details>
        </Grid.Item>
        <Grid.Item span={4}>
          <Checkbox id="f-route" label="Visa resväg" checked={routes} onChange={e => onRoutes(e.target.checked)} />
        </Grid.Item>
      </Grid>
    </Stack>
  );
}
