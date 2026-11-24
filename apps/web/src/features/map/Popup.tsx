import { Stack } from '@frame/core';
import { Details } from '../listings/Details.tsx';
import type { Listing } from '../listings/Listing.ts';
import styles from './MapView.module.css';

/** DESIGN.md §7 popup: the same lines as the card, then the link to the original ad. No route line. */
export function Popup({ l, today }: { l: Listing; today: string }) {
  return (
    <Stack gap={1}>
      <Details l={l} today={today} lines />
      {l.url && <a className={styles.open} href={l.url} target="_blank" rel="noopener noreferrer">Öppna annons på {l.sourceName} ›</a>}
    </Stack>
  );
}
