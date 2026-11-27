import { Details, Meta } from '../listings/Details.tsx';
import type { Listing } from '../listings/Listing.ts';
import styles from '../listings/Details.module.css';

/** DESIGN.md §7 popup: the card's grid, link and route text. The route is drawn on the map, not here. */
export function Popup({ l, today }: { l: Listing; today: string }) {
  return (
    <div className={styles.grid}>
      <Details l={l} />
      <Meta l={l} today={today} />
    </div>
  );
}
