import { Container } from '@frame/core';
import { Text } from '@frame/ui';
import { ROUTES } from '../../app/useRoute.ts';
import { BRAND } from './Navbar.tsx';
import styles from './Footer.module.css';

const COLUMNS = [
  { title: 'Tjänsten', links: [['Karta', ROUTES.karta], ['Om tjänsten', ROUTES.om], ['Skapa konto', ROUTES['skapa-konto']]] },
  { title: 'Hjälp', links: [['Vanliga frågor', ROUTES.om], ['Kontakt', ROUTES.om], ['Logga in', ROUTES['logga-in']]] },
  { title: 'Juridiskt', links: [['Integritet', ROUTES.om], ['Villkor', ROUTES.om], ['Cookies', ROUTES.om]] },
] as const;

/** Filler links for now: every one points at a page that does not exist yet. */
export function Footer({ size }: { size: 'default' | 'wide' }) {
  return (
    <footer className={styles.footer}>
      <Container size={size}>
        <div className={styles.grid}>
          <div className={styles.about}>
            <Text size="md" weight="bold">{BRAND}</Text>
            <Text as="p" size="sm" tone="secondary">Alla hyresannonser på en karta, med restid till Karlaplan.</Text>
          </div>
          {COLUMNS.map(c => (
            <nav key={c.title} className={styles.column} aria-label={c.title}>
              <Text size="xs" tone="muted" weight="semibold">{c.title}</Text>
              {c.links.map(([label, href]) => <a key={label} href={href} className={styles.link}>{label}</a>)}
            </nav>
          ))}
        </div>
        <Text as="p" size="xs" tone="muted" className={styles.legal}>© 2026 {BRAND}. Annonserna tillhör respektive källa.</Text>
      </Container>
    </footer>
  );
}
