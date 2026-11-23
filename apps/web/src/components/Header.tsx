import { fmt, SEP, SLIDERS, type PageFilters } from '@lk/shared';

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

const Slider = ({ id, label, value, show, limits, onChange }: { id: string; label: string; value: number; show: (v: number) => string; limits: { min: number; max: number; step: number }; onChange: (v: number) => void }) => (
  <label className="frow">
    <span className="t3">{label}</span>
    <input id={`f-${id}`} type="range" min={limits.min} max={limits.max} step={limits.step} value={value} onChange={e => onChange(Number(e.target.value))} />
    <output className="t2" id={`o-${id}`}>{show(value)}</output>
  </label>
);

export function Header({ filters, onFilters, routes, onRoutes, shown, newCount, loaded, error }: Props) {
  return (
    <header>
      <h1>Lägenheter nära Karlaplan</h1>
      <div className="t3" id="meta">
        {error ? 'Kunde inte ladda' : loaded && <>{fmt.traffar(shown)}{SEP}<span id="nya">{fmt.nya(newCount)}</span>{SEP}{fmt.filterSummary(filters)}</>}
      </div>
      <div className="tools">
        <details>
          <summary>Filter</summary>
          <Slider id="min" label="Restid" value={filters.min} show={fmt.sliderMin} limits={SLIDERS.min} onChange={min => onFilters({ min })} />
          <Slider id="rent" label="Hyra" value={filters.rent} show={fmt.sliderRent} limits={SLIDERS.rent} onChange={rent => onFilters({ rent })} />
          <Slider id="m2" label="Storlek" value={filters.m2} show={fmt.sliderM2} limits={SLIDERS.m2} onChange={m2 => onFilters({ m2 })} />
          <label className="frow">
            <span className="t3">Bara nya</span>
            <input id="f-new" type="checkbox" checked={filters.onlyNew} onChange={e => onFilters({ onlyNew: e.target.checked })} />
          </label>
        </details>
        <label><input id="f-route" type="checkbox" checked={routes} onChange={e => onRoutes(e.target.checked)} />Visa resväg</label>
      </div>
    </header>
  );
}
