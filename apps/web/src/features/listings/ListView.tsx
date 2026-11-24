import { Text } from '@frame/ui';
import { Card } from './Card.tsx';
import type { Listing } from './Listing.ts';
import styles from './ListView.module.css';

/** DESIGN.md §4.4: the cards, already filtered and sorted by the page. */
export function ListView({ items, today, selectedId, onPick, error }: { items: Listing[]; today: string; selectedId: number | null; onPick: (l: Listing) => void; error: Error | null }) {
  return (
    <div id="list" className={styles.list}>
      {error
        ? <Text as="p" size="xs" tone="muted" className={styles.empty}>{error.message}</Text>
        : items.length
          ? items.map(l => <Card key={l.id} l={l} today={today} selected={l.id === selectedId} onPick={onPick} />)
          : <Text as="p" tone="secondary" className={styles.empty}>Inga träffar med de här filtren</Text>}
    </div>
  );
}
