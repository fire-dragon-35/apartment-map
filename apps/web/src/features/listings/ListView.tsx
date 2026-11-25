import { Text } from '@frame/ui';
import { useLayoutEffect, useRef, useState } from 'react';
import { Card } from './Card.tsx';
import type { Listing } from './Listing.ts';
import styles from './ListView.module.css';

/** The list shows this many cards; the rest scroll inside the list. */
const ROWS = 5;

/** DESIGN.md §4.4: the cards, already filtered and sorted by the page. */
export function ListView({ items, today, selectedId, hoveredId, onPick, onHover, error }: {
  items: Listing[]; today: string; selectedId: number | null; hoveredId: number | null;
  onPick: (l: Listing) => void; onHover: (id: number | null) => void; error: Error | null;
}) {
  const list = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>();

  // The height of ROWS cards, measured: cards differ in height (route lines wrap on narrow screens).
  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    const measure = () => {
      const last = el.children[ROWS - 1];
      setHeight(last && el.children.length > ROWS
        ? last.getBoundingClientRect().bottom - el.getBoundingClientRect().top
        : undefined);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [items, error]);

  return (
    // A measured height has no CSS-only form (the cards differ in height), so this one inline style stays.
    // eslint-disable-next-line no-restricted-syntax
    <div id="list" ref={list} className={styles.list} style={height ? { maxHeight: height } : undefined}>
      {error
        ? <Text as="p" size="xs" tone="muted" className={styles.empty}>{error.message}</Text>
        : items.length
          ? items.map(l => <Card key={l.id} l={l} today={today} selected={l.id === selectedId} hot={l.id === hoveredId} onPick={onPick} onHover={onHover} />)
          : <Text as="p" tone="secondary" className={styles.empty}>Inga träffar med de här filtren</Text>}
    </div>
  );
}
