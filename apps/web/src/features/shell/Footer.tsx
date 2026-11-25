import { Footer as FrameFooter } from '@frame/site';
import { ROUTES } from '../../app/useRoute.ts';
import { BRAND, Wordmark } from './Wordmark.tsx';

/** Filler links for now: every one points at a page that does not exist yet. */
const COLUMNS = [
  { title: 'Tjänsten', links: [{ label: 'Karta', href: ROUTES.karta }, { label: 'Om tjänsten', href: ROUTES.om }, { label: 'Skapa konto', href: ROUTES['skapa-konto'] }] },
  { title: 'Hjälp', links: [{ label: 'Vanliga frågor', href: ROUTES.om }, { label: 'Kontakt', href: ROUTES.om }, { label: 'Logga in', href: ROUTES['logga-in'] }] },
  { title: 'Juridiskt', links: [{ label: 'Integritet', href: ROUTES.om }, { label: 'Villkor', href: ROUTES.om }, { label: 'Cookies', href: ROUTES.om }] },
];

export function Footer({ size }: { size: 'default' | 'wide' }) {
  return (
    <FrameFooter size={size} brand={<Wordmark />} columns={COLUMNS}
      tagline="Alla hyresannonser på en karta, med restid till Karlaplan."
      legal={`© 2026 ${BRAND}. Annonserna tillhör respektive källa.`} />
  );
}
