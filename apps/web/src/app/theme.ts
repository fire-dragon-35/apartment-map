/**
 * DESIGN.md §3 as a Frame theme, plus the data colours (price bands, sources) as CSS custom properties on :root.
 * One source for every value: @lk/shared.
 */
import type { Theme } from '@frame/themes';
import { cssVariables, PRICE_BANDS, TOKENS } from '@lk/shared';

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, system-ui, sans-serif';

export const appTheme: Theme = {
  name: 'lagenhetskartan',
  colors: {
    background: '#ffffff',
    foreground: TOKENS.text1,
    surface: '#ffffff',
    surfaceSecondary: TOKENS.tagBg,
    border: TOKENS.line,
    primary: TOKENS.accent,
    primaryForeground: '#ffffff',
    danger: PRICE_BANDS[4]!.text,
    success: PRICE_BANDS[0]!.text,
    muted: TOKENS.text3,
  },
  typography: { body: FONT, heading: FONT },
  radius: { control: '0.5rem', panel: '0.75rem' },
  space: { panel: '1rem' },
  control: { height: '2.25rem' },
  focusRing: '0 0 0 3px rgb(0 122 255 / 35%)',
  density: 'comfortable',
};

/** The DESIGN.md tokens Frame has no name for (text 2, price and source colours, …), set once before the first render. */
export function applyDomainTokens(root: HTMLElement = document.documentElement): void {
  for (const [name, value] of Object.entries(cssVariables())) root.style.setProperty(name, value);
}
