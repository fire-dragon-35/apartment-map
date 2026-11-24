/** DESIGN.md §5. Every datum is formatted here and nowhere else. */
export const NB = ' ';
export const SEP = ' · ';
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

export const PRICE_BANDS = [
  { below: 250, color: '#C9D9C3', edge: '#A3B89C', text: '#4E6B47', label: '<250' },
  { below: 300, color: '#9FBFA8', edge: '#7A9E85', text: '#3F6A4C', label: '250 till 299' },
  { below: 350, color: '#6F9C8E', edge: '#527D70', text: '#2F5F51', label: '300 till 349' },
  { below: 400, color: '#4A6F7A', edge: '#35545D', text: '#2C4E58', label: '350 till 399' },
  { below: Infinity, color: '#2E4057', edge: '#1D2A3A', text: '#2E4057', label: '400+ kr/m²' },
] as const;
export const PRICE_UNKNOWN = { color: '#AEAEB2', edge: '#8E8E93', text: '#6C6C70' } as const;

export const priceBand = (kpm: number | null) => (kpm === null ? null : PRICE_BANDS.find(b => kpm < b.below)!);

const thousands = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NB);
const k = (kr: number) => `${Math.round(kr / 100) / 10}k`;

export const fmt = {
  restid: (minutes: number, approx = false) => `${approx ? '~' : ''}${minutes}${NB}min`,
  hyra: (kr: number | null) => `${kr ? k(kr) : '?'}${NB}kr`,
  storlek: (m2: number | null) => `${m2 ?? '?'}${NB}m²`,
  rum: (rooms: number | null) => (rooms ? `${rooms}${NB}rok` : ''),
  kpm: (kpm: number | null) => `${kpm === null ? '?' : thousands(kpm)}${NB}kr/m²`,
  datum(iso: string, thisYear = new Date().getFullYear()) {
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return '?';
    return `${d.getDate()}${NB}${MONTHS[d.getMonth()]}${d.getFullYear() !== thisYear ? NB + d.getFullYear() : ''}`;
  },
  /** start → slut; `nu` for today or earlier, `?` unknown, `tills vidare` open ended. */
  avtal(start: string | null, end: string | null, today: string) {
    const from = start === null ? '?' : start <= today ? 'nu' : fmt.datum(start);
    return `${from} → ${end === null ? 'tills vidare' : fmt.datum(end)}`;
  },
  alder(firstSeen: string | null, today: string) {
    if (firstSeen === null) return '';
    const days = Math.round((Date.parse(today) - Date.parse(firstSeen)) / 864e5);
    return days <= 0 ? 'idag' : `${days}${NB}d`;
  },
  /** The three sliders of DESIGN.md §4 as their labels, and the header summary of the active filters. */
  sliderMin: (v: number) => `≤${NB}${v}${NB}min`,
  sliderRent: (v: number) => `≤${NB}${k(v)}${NB}kr`,
  sliderM2: (v: number) => `≥${NB}${v}${NB}m²`,
  filterSummary: (f: { min: number; rent: number; m2: number }) =>
    [`≤${NB}${k(f.rent)}${NB}kr`, `≥${NB}${f.m2}${NB}m²`, `≥${NB}6${NB}mån`, `≤${NB}${f.min}${NB}min`].join(SEP),
  traffar: (n: number) => `${n}${NB}träffar`,
  nya: (n: number) => `${n}${NB}nya`,
  gang: (minutes: number) => `gång${NB}${minutes}${NB}min`,
  linje: (mode: string, line: string) => (mode === 'metro' ? `T${line}` : line),
};
