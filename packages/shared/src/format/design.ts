/**
 * DESIGN.md §3 and §7: tokens, colours and the small presentation rules, in one place for the page and anything else
 * that draws listings. Pure, zod free.
 */
import { SOURCE_NAMES, type Source } from '../domain/source.ts';
import { PRICE_BANDS, PRICE_UNKNOWN, priceBand, SLIDERS } from './index.ts';

/** DESIGN.md §3 (v4.0, EnkelLGH): black and white, one indigo accent, traffic light only for price. */
export const TOKENS = {
  text1: '#0A0A0A', text2: '#3A3A3A', text3: '#6E6E6E', line: '#EAEAEA', accent: '#5B4BFF', accentText: '#3A2DC2',
  newBg: '#EEEBFF', selected: '#5B4BFF', tagBg: '#F0F0F2', mapBg: '#F1F1EE', warnBg: '#16161C', warnText: '#FFFFFF',
  white: '#FFFFFF', guide: '#8E8E93',
  shadowPop: '0 8px 24px rgb(0 0 0 / 14%)', shadowThumb: '0 0 0 1px rgb(0 0 0 / 8%), 0 1px 4px rgb(0 0 0 / 28%)',
} as const;

/** CSS custom properties for :root, so the style sheet never repeats a token. */
export function cssVariables(): Record<string, string> {
  return {
    '--t1': TOKENS.text1, '--t2': TOKENS.text2, '--t3': TOKENS.text3, '--line': TOKENS.line, '--accent': TOKENS.accent,
    '--new': TOKENS.newBg, '--selected': TOKENS.selected, '--tag': TOKENS.tagBg, '--map-bg': TOKENS.mapBg,
    '--accent-text': TOKENS.accentText, '--warn-bg': TOKENS.warnBg, '--warn-text': TOKENS.warnText,
    '--shadow-pop': TOKENS.shadowPop, '--shadow-thumb': TOKENS.shadowThumb,
    ...Object.fromEntries(PRICE_BANDS.flatMap((b, i) => [[`--price-${i + 1}`, b.color], [`--price-text-${i + 1}`, b.text]])),
    '--price-unknown': PRICE_UNKNOWN.color,
  };
}

/** Sources are neutral (DESIGN.md §3): the name tells them apart; colour belongs to price. */
export const SOURCE_COLORS: Record<string, string> = {};
export const SOURCE_OTHER = TOKENS.text2;

export interface PageFilters { min: number; rent: number; kpm: number; m2: number; m2Max: number; rooms: number; roomsMax: number; onlyNew: boolean }
export const DEFAULT_FILTERS: PageFilters = {
  min: 30, rent: SLIDERS.rent.max, kpm: SLIDERS.kpm.max, m2: SLIDERS.m2.min, m2Max: SLIDERS.m2.max,
  rooms: SLIDERS.rooms.min, roomsMax: SLIDERS.rooms.max, onlyNew: false,
};

/** DESIGN.md §10 page filters, without "Bara nya" (R8 counts the new ones within these): restid, hyra, kr/m², storlek, rum, contract. An end of a slider is no limit. */
export const passesFilters = (
  l: { t: number; rent: number | null; kpm: number | null; m2: number | null; rooms: number | null; contractOk: boolean },
  f: Pick<PageFilters, 'min' | 'rent' | 'kpm' | 'm2' | 'm2Max' | 'rooms' | 'roomsMax'>,
) =>
  (f.min >= SLIDERS.min.max || l.t <= f.min)
  && (f.rent >= SLIDERS.rent.max || !l.rent || l.rent <= f.rent)
  && (f.kpm >= SLIDERS.kpm.max || l.kpm === null || l.kpm <= f.kpm)
  && (!l.m2 || ((f.m2 <= SLIDERS.m2.min || l.m2 >= f.m2) && (f.m2Max >= SLIDERS.m2.max || l.m2 <= f.m2Max)))
  && (!l.rooms || ((f.rooms <= SLIDERS.rooms.min || l.rooms >= f.rooms) && (f.roomsMax >= SLIDERS.rooms.max || l.rooms <= f.roomsMax)))
  && l.contractOk;

/** The kr/m² chip: the price colour at 20 % behind its darker text colour; grey when unknown. */
export function priceChip(kpm: number | null): { background: string; color: string } {
  const band = priceBand(kpm);
  return band ? { background: `${band.color}33`, color: band.text } : { background: `${PRICE_UNKNOWN.color}33`, color: PRICE_UNKNOWN.text };
}

/** The source chip: the platform colour at 12 % behind itself. */
export function sourceChip(sourceName: string): { background: string; color: string } {
  const c = SOURCE_COLORS[sourceName] ?? SOURCE_OTHER;
  return { background: TOKENS.tagBg, color: c };
}

/** Pin radius in px: 6 + 6 × clamp((√m² − √20) / (√65 − √20), 0, 1). Unknown size counts as 20 m². */
export function pinRadius(m2: number | null): number {
  const [lo, hi] = [Math.sqrt(20), Math.sqrt(65)];
  return 6 + 6 * Math.min(1, Math.max(0, (Math.sqrt(m2 ?? 20) - lo) / (hi - lo)));
}

/** Page filter: a contract of at least 180 days from its start (or from today if it started); open ended passes. */
export function contractOk(start: string | null, end: string | null, today: string, minDays = 180): boolean {
  if (end === null) return true;
  const from = start !== null && start > today ? start : today;
  return (Date.parse(end) - Date.parse(from)) / 864e5 >= minDays;
}

export interface TagInput {
  firstHand: boolean | null;
  student: boolean | null;
  furnished: boolean | null;
  flags: readonly string[];
  notes: readonly string[];
  /** other sites that list the same flat */
  alsoOn: readonly string[];
}

/** DESIGN.md §5 notes, lower case; queue notes are never shown. */
export function tags(l: TagInput): string[] {
  const out: (string | null)[] = [
    l.firstHand === true ? 'förstahand' : null,
    l.student === true ? 'studentlägenhet' : null,
    l.flags.includes('short_lease') ? 'korttid' : null,
    l.notes.includes('extension_possible') ? 'kan förlängas' : null,
    l.alsoOn.length ? `finns även på ${l.alsoOn.map(s => SOURCE_NAMES[s as Source] ?? s).join(', ')}` : null,
    l.furnished === true ? 'möblerad' : l.furnished === false ? 'omöblerad' : null,
  ];
  return out.filter((t): t is string => t !== null);
}

/** `! långt under marknadspris` applies to this flag. */
export const isBelowMarket = (flags: readonly string[]) => flags.includes('below_market');

/** Område: the area, hidden when it is "Stockholm" or the same as the address. */
export const omrade = (area: string | null, street: string | null): string => (area && area !== 'Stockholm' && area !== street ? area : '');
