import type { Listing } from '../domain/Listing.ts';
import { Card } from './Card.tsx';

export function ListView({ items, today, selectedId, onPick, error }: { items: Listing[]; today: string; selectedId: number | null; onPick: (l: Listing) => void; error: Error | null }) {
  if (error) return <main id="list"><p className="t3 empty">{error.message}</p></main>;
  return (
    <main id="list">
      {items.length
        ? items.map(l => <Card key={l.id} l={l} today={today} selected={l.id === selectedId} onPick={onPick} />)
        : <p className="t2 empty">Inga träffar med de här filtren</p>}
    </main>
  );
}
