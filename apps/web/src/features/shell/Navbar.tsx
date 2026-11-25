import { ButtonLink } from '@frame/ui';
import { Navbar as FrameNavbar } from '@frame/site';
import { ROUTES, type RouteId } from '../../app/useRoute.ts';
import { BRAND, Wordmark } from './Wordmark.tsx';

const LINKS = [['hem', 'Hem'], ['karta', 'Karta'], ['om', 'Om tjänsten']] as const;

/** The site bar (Frame `Navbar`): wordmark, pages, log in and sign up. */
export function Navbar({ route, size }: { route: RouteId; size: 'default' | 'wide' }) {
  return (
    <FrameNavbar size={size} brand={<Wordmark />} brandLabel={`${BRAND}, startsidan`} brandHref={ROUTES.hem}
      navLabel="Huvudmeny" menuLabel="Meny"
      links={LINKS.map(([id, label]) => ({ label, href: ROUTES[id], current: route === id }))}
      actions={<>
        <ButtonLink variant="ghost" href={ROUTES['logga-in']} aria-current={route === 'logga-in' ? 'page' : undefined}>Logga in</ButtonLink>
        <ButtonLink href={ROUTES['skapa-konto']}>Skapa konto</ButtonLink>
      </>} />
  );
}
