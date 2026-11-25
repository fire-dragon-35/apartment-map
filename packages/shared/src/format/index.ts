/** DESIGN.md §5. Every datum is formatted here and nowhere else. */
export const NB = ' ';
export const SEP = ' · ';
/**
 * DESIGN.md §4: the filter sliders. The ends of every slider mean no limit (`60+ min`, `100+ m²`, `4+ rum`), so the default
 * shows everything. restid, hyra and kr/m² are upper limits only; storlek and rum are ranges.
 */
export const SLIDERS = {
  min: { min: 0, max: 60, step: 1 },
  rent: { min: 0, max: 30000, step: 500 },
  kpm: { min: 0, max: 700, step: 25 },
  m2: { min: 0, max: 100, step: 5 },
  rooms: { min: 1, max: 4, step: 0.5 },
} as const;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

export const PRICE_BANDS = [
  { below: 250, color: '#34C759', edge: '#FFFFFF', text: '#1E7B34', label: '<250' },
  { below: 350, color: '#A3D63C', edge: '#FFFFFF', text: '#4A7208', label: '250 till 349' },
  { below: 450, color: '#FFCC00', edge: '#FFFFFF', text: '#7F6200', label: '350 till 449' },
  { below: 550, color: '#FF9500', edge: '#FFFFFF', text: '#9C4E00', label: '450 till 549' },
  { below: Infinity, color: '#FF3B30', edge: '#FFFFFF', text: '#B42318', label: '550+ kr/m²' },
] as const;
export const PRICE_UNKNOWN = { color: '#AEAEB2', edge: '#FFFFFF', text: '#6E6E6E' } as const;

export const priceBand = (kpm: number | null) => (kpm === null ? null : PRICE_BANDS.find(b => kpm < b.below)!);

const thousands = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NB);
const k = (kr: number) => `${Math.round(kr / 100) / 10}k`;

export const fmt = {
  restid: (minutes: number, approx = false) => `${approx ? '~' : ''}${minutes}${NB}min`,
  /** the rent without its unit, for the card: `15.2k`, `?` unknown */
  hyraTal: (kr: number | null) => (kr ? k(kr) : '?'),
  hyra: (kr: number | null) => `${fmt.hyraTal(kr)}${NB}kr`,
  storlek: (m2: number | null) => `${m2 ?? '?'}${NB}m²`,
  rum: (rooms: number | null) => (rooms ? `${rooms}${NB}rok` : ''),
  kpm: (kpm: number | null) => `${kpm === null ? '?' : thousands(kpm)}${NB}kr/m²`,
  datum(iso: string, thisYear = new Date().getFullYear()) {
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return '?';
    return `${d.getDate()}${NB}${MONTHS[d.getMonth()]}${d.getFullYear() !== thisYear ? NB + d.getFullYear() : ''}`;
  },
  /** start > slut; `nu` for today or earlier, `?` unknown, `tills vidare` open ended. */
  avtal(start: string | null, end: string | null, today: string) {
    const from = start === null ? '?' : start <= today ? 'nu' : fmt.datum(start);
    return `${from} > ${end === null ? 'tills vidare' : fmt.datum(end)}`;
  },
  alder(firstSeen: string | null, today: string) {
    if (firstSeen === null) return '';
    const days = Math.round((Date.parse(today) - Date.parse(firstSeen)) / 864e5);
    return days <= 0 ? 'idag' : `${days}${NB}d`;
  },
  /** A slider range as text, `10–25 min`; a `+` marks the top end as no limit. */
  range: (lo: number, hi: number, top: number, unit: string, num: (n: number) => string = String) =>
    `${num(lo)}–${num(hi)}${hi >= top ? '+' : ''}${NB}${unit}`,
  /** A single upper limit as text, `≤ 25 min`; the top end is `60+ min`. */
  upTo: (hi: number, top: number, unit: string, num: (n: number) => string = String) =>
    hi >= top ? `${num(top)}+${NB}${unit}` : `≤${NB}${num(hi)}${NB}${unit}`,
  kilo: k,
  rooms: (n: number) => String(n).replace('.', ','),
  /** The header summary: only the limits that are set. */
  filterSummary: (f: { min: number; rent: number; kpm: number; m2: number; m2Max: number; rooms: number; roomsMax: number }) => [
    ...(f.rent < SLIDERS.rent.max ? [`≤${NB}${k(f.rent)}${NB}kr`] : []),
    ...(f.kpm < SLIDERS.kpm.max ? [`≤${NB}${f.kpm}${NB}kr/m²`] : []),
    ...(f.m2 > SLIDERS.m2.min || f.m2Max < SLIDERS.m2.max ? [fmt.range(f.m2, f.m2Max, SLIDERS.m2.max, 'm²')] : []),
    ...(f.rooms > SLIDERS.rooms.min || f.roomsMax < SLIDERS.rooms.max ? [fmt.range(f.rooms, f.roomsMax, SLIDERS.rooms.max, 'rum', fmt.rooms)] : []),
    ...(f.min < SLIDERS.min.max ? [`≤${NB}${f.min}${NB}min`] : []),
  ].join(SEP),
  traffar: (n: number) => `${n}${NB}träffar`,
  nya: (n: number) => `${n}${NB}nya`,
  gang: (minutes: number) => `gång${NB}${minutes}${NB}min`,
  linje: (mode: string, line: string) => (mode === 'metro' ? `T${line}` : line),
};
