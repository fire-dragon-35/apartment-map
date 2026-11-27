import { Footer as FrameFooter } from '@frame/site';
import { ROUTES, section } from '../../app/useRoute.ts';
import { BRAND, Wordmark } from './Wordmark.tsx';
import styles from './Footer.module.css';

/** Every link goes to a page in the navbar, or to a section of one (Om tjänsten holds questions, contact, data and legal). */
const COLUMNS = [
  { title: 'Tjänsten', links: [{ label: 'Karta', href: ROUTES.karta }, { label: 'Om tjänsten', href: ROUTES.om }, { label: 'Datakällor', href: section('om', 'data') }] },
  { title: 'Hjälp', links: [{ label: 'Vanliga frågor', href: section('om', 'fragor') }, { label: 'Kontakt', href: section('om', 'kontakt') }, { label: 'Logga in', href: ROUTES['logga-in'] }] },
  { title: 'Juridiskt', links: [{ label: 'Integritetspolicy', href: section('om', 'integritet') }, { label: 'Villkor', href: section('om', 'villkor') }] },
];

export function Footer() {
  return (
    <FrameFooter size="narrow" tone="dark" brand={<Wordmark />} columns={COLUMNS}
      tagline="Alla hyresannonser på en karta, med restider."
      legal={<span className={styles.legal}>{`© 2026 ${BRAND}. Annonserna tillhör respektive källa.`}</span>} />
  );
}
