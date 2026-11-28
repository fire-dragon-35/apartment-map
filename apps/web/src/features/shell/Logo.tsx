import styles from './Logo.module.css';

export const BRAND = 'EnkelLGH';

/**
 * DESIGN.md §3: the logo from the brand kit (`public/brand/`), symbol + wordmark. `ink` is the version for dark
 * backgrounds (the footer). In the navbar, screens under 380 px show the symbol tile alone.
 */
export function Logo({ tone = 'light' }: { tone?: 'light' | 'ink' }) {
  if (tone === 'ink') return <img className={styles.logo} src="/brand/logo-on-ink.svg" alt={BRAND} width={128} height={28} />;
  return (
    <picture>
      <source media="(max-width: 379px)" srcSet="/brand/favicon.svg" width={28} height={28} />
      <img className={styles.logo} src="/brand/logo.svg" alt={BRAND} width={128} height={28} />
    </picture>
  );
}
