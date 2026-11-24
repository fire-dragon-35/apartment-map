import text from '../../app/text.module.css';
import { Card } from './Card.tsx';
import type { Listing } from './Listing.ts';
import styles from './ListView.module.css';

/** DESIGN.md §4.4: the cards, already filtered and sorted by the page. */
export function ListView({ items, today, selectedId, onPick, error }: { items: Listing[]; today: string; selectedId: number | null; onPick: (l: Listing) => void; error: Error | null }) {
  return (
    <div id="list" className={styles.list}>
      {error
        ? <p className={`${styles.empty} ${text.t3}`}>{error.message}</p>
        : items.length
          ? items.map(l => <Card key={l.id} l={l} today={today} selected={l.id === selectedId} onPick={onPick} />)
          : <p className={`${styles.empty} ${text.t2}`}>Inga träffar med de här filtren</p>}
    </div>
  );
}
