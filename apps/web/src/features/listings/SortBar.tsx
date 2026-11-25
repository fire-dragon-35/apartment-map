import { Button, Field, Select } from '@frame/ui';
import { SORT_OPTIONS, type SortKey, type SortState } from './sort.ts';
import styles from './SortBar.module.css';

/** The list's sort: a key from the select, and a button that flips the direction. */
export function SortBar({ sort, onSort }: { sort: SortState; onSort: (s: SortState) => void }) {
  return (
    <div className={styles.bar}>
      <Field label="Sortera">
        {p => (
          <Select {...p} value={sort.key} onChange={e => {
            const option = SORT_OPTIONS.find(o => o.key === (e.target.value as SortKey))!;
            onSort({ key: option.key, dir: option.dir });
          }}>
            {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </Select>
        )}
      </Field>
      <Button variant="secondary" className={styles.dir} onClick={() => onSort({ ...sort, dir: sort.dir === 'asc' ? 'desc' : 'asc' })}>
        {sort.dir === 'asc' ? '↑ Stigande' : '↓ Fallande'}
      </Button>
    </div>
  );
}
