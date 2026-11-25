import styles from './Wordmark.module.css';

export const BRAND = 'EnkelLGH';

/** DESIGN.md §3: `Enkel` regular + `LGH` bold in the accent. */
export function Wordmark() {
  return <span className={styles.mark}>Enkel<b className={styles.lgh}>LGH</b></span>;
}
