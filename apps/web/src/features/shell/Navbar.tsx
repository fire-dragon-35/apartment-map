import { Container } from '@frame/core';
import { Text } from '@frame/ui';
import { ROUTES, type RouteId } from '../../app/useRoute.ts';
import { Logo } from './Logo.tsx';
import styles from './Navbar.module.css';

export const BRAND = 'EnkelLGH';

const LINKS = [
  { id: 'hem', label: 'Hem' },
  { id: 'karta', label: 'Karta' },
  { id: 'om', label: 'Om tjänsten' },
] as const;

interface Props { route: RouteId; size: 'default' | 'wide' }

/** Logo and brand at the left, the pages in the middle, login and sign-up at the right. Scrolls away with the page (DESIGN.md R1). Under 640 px the links fold into a `<details>` menu. */
export function Navbar({ route, size }: Props) {
  const links = LINKS.map(l => (
    <a key={l.id} href={ROUTES[l.id]} className={styles.link} aria-current={route === l.id ? 'page' : undefined}>{l.label}</a>
  ));
  const account = (
    <>
      <a href={ROUTES['logga-in']} className={styles.link} aria-current={route === 'logga-in' ? 'page' : undefined}>Logga in</a>
      <a href={ROUTES['skapa-konto']} className={styles.cta}>Skapa konto</a>
    </>
  );
  return (
    <header className={styles.bar}>
      <Container size={size}>
        <div className={styles.row}>
          <a href={ROUTES.hem} className={styles.brand} aria-label={`${BRAND}, startsidan`}>
            <Logo />
            <Text size="md" weight="bold">{BRAND}</Text>
          </a>
          <nav className={styles.nav} aria-label="Huvudmeny">{links}</nav>
          <div className={styles.account}>{account}</div>
          <details className={styles.menu}>
            <summary className={styles.burger} aria-label="Meny"><span /><span /><span /></summary>
            <nav className={styles.sheet} aria-label="Mobilmeny">{links}{account}</nav>
          </details>
        </div>
      </Container>
    </header>
  );
}
