import { Button } from '@frame/ui';
import { SORT_OPTIONS, type SortState } from './sort.ts';
import styles from './SortBar.module.css';

/** The list's sort, one tap: a key picks it in its natural direction; the chosen key again flips the direction. */
export function SortBar({ sort, onSort }: { sort: SortState; onSort: (s: SortState) => void }) {
  return (
    <div className={styles.bar} role="group" aria-label="Sortera">
      {SORT_OPTIONS.map(o => {
        const on = o.key === sort.key;
        return (
          <Button key={o.key} variant={on ? 'secondary' : 'ghost'} className={styles.key} aria-pressed={on}
            onClick={() => onSort(on ? { ...sort, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key: o.key, dir: o.dir })}>
            {o.label}{on && (sort.dir === 'asc' ? ' ↑' : ' ↓')}
          </Button>
        );
      })}
    </div>
  );
}
