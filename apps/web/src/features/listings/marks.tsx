import { createContext, useContext } from 'react';
import { Checkbox } from '@frame/ui';
import type { Listing } from './Listing.ts';
import styles from './Details.module.css';

/** The map page's checked-off listings (Plus), for the card and the popup without passing props through the list. */
export const MarksContext = createContext<{ canMark: boolean; toggle: (id: number) => void }>({ canMark: false, toggle: () => {} });

/** "Sålla" (Plus): greys the listing on the map and in the list. Shown to everyone, unavailable without Plus. */
export function MarkBox({ l }: { l: Listing }) {
  const { canMark, toggle } = useContext(MarksContext);
  return (
    <span className={styles.mark} title={canMark ? undefined : 'Ingår i Plus'}>
      <Checkbox label="Sålla" checked={l.done} disabled={!canMark} onChange={() => toggle(l.id)} />
    </span>
  );
}
