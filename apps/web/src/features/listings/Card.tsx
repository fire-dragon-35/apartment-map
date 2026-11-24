import { Stack } from '@frame/core';
import { memo } from 'react';
import { Details, RouteLine, SourceLink } from './Details.tsx';
import type { Listing } from './Listing.ts';
import styles from './Card.module.css';

/**
 * DESIGN.md §7 card: the same layout and link as the popup. The tappable part is a full width button; the link sits
 * after it (a link cannot live inside a button). New today and selected are attributes, styled by the module.
 */
export const Card = memo(function Card({ l, today, selected, onPick }: { l: Listing; today: string; selected: boolean; onPick: (l: Listing) => void }) {
  return (
    <div className={styles.item}>
      <button type="button" className={styles.card} id={`c${l.id}`} data-card={l.id} data-new={l.isNew || undefined}
        aria-pressed={selected} onClick={() => onPick(l)}>
        <Stack as="span" gap={1}>
          <Details l={l} today={today} />
          {selected && <RouteLine l={l} />}
        </Stack>
      </button>
      {l.url && <div className={styles.foot}><SourceLink l={l} /></div>}
    </div>
  );
});
