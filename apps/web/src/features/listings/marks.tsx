import { createContext, useContext } from 'react';
import { Button, ButtonLink } from '@frame/ui';
import { ROUTES } from '../../app/useRoute.ts';
import type { Listing } from './Listing.ts';
import styles from './Details.module.css';

/** The map page's checked-off listings (Plus), for the card and the popup without passing props through the list. */
export const MarksContext = createContext<{ canMark: boolean; toggle: (id: number) => void }>({ canMark: false, toggle: () => {} });

/**
 * "Bocka av": greys the listing on the map and in the list (seen, not interested, applied). Plus users toggle it;
 * others see it in the popup only, as a link to Plus.
 */
export function MarkButton({ l, inPopup }: { l: Listing; inPopup: boolean }) {
  const { canMark, toggle } = useContext(MarksContext);
  if (!canMark) return inPopup ? <ButtonLink variant="ghost" href={ROUTES.plus} className={styles.mark}>Bocka av med Plus</ButtonLink> : null;
  return (
    <Button variant="ghost" className={styles.mark} aria-pressed={l.done} title="Kollad, inte intressant eller sökt"
      onClick={e => { e.stopPropagation(); toggle(l.id); }}>
      {l.done ? '✓ Avbockad' : 'Bocka av'}
    </Button>
  );
}
