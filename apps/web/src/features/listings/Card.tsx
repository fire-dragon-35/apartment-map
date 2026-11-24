import { Stack } from '@frame/core';
import { memo } from 'react';
import { Details, RouteLine } from './Details.tsx';
import type { Listing } from './Listing.ts';
import styles from './Card.module.css';

/** DESIGN.md §7 card: a full width button; new today and selected are attributes, styled by the module. */
export const Card = memo(function Card({ l, today, selected, onPick }: { l: Listing; today: string; selected: boolean; onPick: (l: Listing) => void }) {
  return (
    <button type="button" className={styles.card} id={`c${l.id}`} data-card={l.id} data-new={l.isNew || undefined}
      aria-pressed={selected} onClick={() => onPick(l)}>
      <Stack as="span" gap={1}>
        <Details l={l} today={today} />
        <RouteLine l={l} />
      </Stack>
    </button>
  );
});
