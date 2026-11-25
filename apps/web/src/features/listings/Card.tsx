import { memo } from 'react';
import { CAN_HOVER } from '../../app/hover.ts';
import { Details, Meta } from './Details.tsx';
import type { Listing } from './Listing.ts';
import details from './Details.module.css';
import styles from './Card.module.css';

/**
 * DESIGN.md §7 card: the same grid as the popup. The grid lives on the card; the tappable button spans the whole card
 * and takes the grid's rows (subgrid), so its cells sit in the same places. Line 3 (contract, source link, age) is a
 * sibling of the button, because the source link cannot live inside a button. New today and selected are attributes.
 */
export const Card = memo(function Card({ l, today, selected, hot, onPick, onHover }: {
  l: Listing; today: string; selected: boolean; hot: boolean; onPick: (l: Listing) => void; onHover: (id: number | null) => void;
}) {
  return (
    <div className={`${styles.item} ${details.grid}`} data-hot={hot || undefined}
      onMouseEnter={CAN_HOVER ? () => onHover(l.id) : undefined} onMouseLeave={CAN_HOVER ? () => onHover(null) : undefined}>
      <button type="button" className={styles.card} id={`c${l.id}`} data-card={l.id} data-new={l.isNew || undefined}
        aria-pressed={selected} onClick={() => onPick(l)}>
        <Details l={l} />
      </button>
      <Meta l={l} today={today} />
    </div>
  );
});
