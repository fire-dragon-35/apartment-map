import { Grid, Stack } from '@frame/core';
import { Checkbox, Slider, Text } from '@frame/ui';
import { fmt, SEP, SLIDERS, type PageFilters } from '@lk/shared';
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

/** DESIGN.md §4.1: title, meta line, the Filter <details> and `Visa resväg`. */
export function Header({ filters, onFilters, routes, onRoutes, shown, newCount, loaded, error }: Props) {
  return (
    <Stack gap={2}>
      <h1>Lägenheter nära Karlaplan</h1>
      <Text as="p" size="xs" tone="muted">
        {error ? 'Kunde inte ladda' : loaded && <>{fmt.traffar(shown)}{SEP}<span id="nya">{fmt.nya(newCount)}</span>{SEP}{fmt.filterSummary(filters)}</>}
      </Text>
      <Grid gap={4}>
        <Grid.Item span={8}>
          <details>
            <summary className={styles.summary}>Filter</summary>
            <Stack gap={2} className={styles.filters}>
              <Slider id="f-min" label="Restid" {...SLIDERS.min} value={filters.min} format={fmt.sliderMin} onValueChange={min => onFilters({ min })} />
              <Slider id="f-rent" label="Hyra" {...SLIDERS.rent} value={filters.rent} format={fmt.sliderRent} onValueChange={rent => onFilters({ rent })} />
              <Slider id="f-m2" label="Storlek" {...SLIDERS.m2} value={filters.m2} format={fmt.sliderM2} onValueChange={m2 => onFilters({ m2 })} />
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
