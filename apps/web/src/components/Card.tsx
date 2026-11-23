import { memo } from 'react';
import type { Listing } from '../domain/Listing.ts';
import { Details, RouteLine } from './Details.tsx';

export const Card = memo(function Card({ l, today, selected, onPick }: { l: Listing; today: string; selected: boolean; onPick: (l: Listing) => void }) {
  return (
    <button className={`card${l.isNew ? ' new' : ''}${selected ? ' sel' : ''}`} id={`c${l.id}`} data-id={l.id} aria-pressed={selected} onClick={() => onPick(l)}>
      <Details l={l} today={today} />
      <RouteLine l={l} />
    </button>
  );
});
