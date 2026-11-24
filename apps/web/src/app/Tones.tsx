/* eslint-disable no-restricted-syntax -- the one sanctioned inline style (DESIGN.md §12): a data colour passed as a CSS custom property */
import type { CSSProperties, ReactNode } from 'react';
import styles from './Tones.module.css';

const vars = (v: Record<`--${string}`, string>) => v as CSSProperties;

/** A rounded label in a data colour: the kr/m² chip and the source chip (DESIGN.md §3). */
export function Chip({ fg, bg, children }: { fg: string; bg: string; children: ReactNode }) {
  return <span className={styles.chip} style={vars({ '--tone-fg': fg, '--tone-bg': bg })}>{children}</span>;
}

/** A transit line name on its line colour (route line, DESIGN.md §7). */
export function Pill({ color, children }: { color: string; children: ReactNode }) {
  return <span className={styles.pill} style={vars({ '--tone-bg': color })}>{children}</span>;
}

/** A price dot (legend). */
export function Dot({ color }: { color: string }) {
  return <i className={styles.dot} style={vars({ '--tone-bg': color })} aria-hidden="true" />;
}
