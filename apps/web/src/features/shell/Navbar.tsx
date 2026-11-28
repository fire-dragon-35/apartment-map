import { ButtonLink } from '@frame/ui';
import { useAuth } from '@frame/supabase';
import { Navbar as FrameNavbar } from '@frame/site';
import { ROUTES, type RouteId } from '../../app/useRoute.ts';
import { BRAND, Logo } from './Logo.tsx';

const LINKS = [['hem', 'Hem'], ['karta', 'Karta'], ['plus', 'Plus'], ['om', 'Om tjänsten']] as const;

/** The site bar (Frame `Navbar`): logo, pages, log in and sign up. */
export function Navbar({ route }: { route: RouteId }) {
  const { user } = useAuth();
  return (
    <FrameNavbar size="narrow" brand={<Logo />} brandLabel={`${BRAND}, startsidan`} brandHref={ROUTES.hem}
      navLabel="Huvudmeny" menuLabel="Meny"
      links={LINKS.map(([id, label]) => ({ label, href: ROUTES[id], current: route === id }))}
      actions={<ButtonLink variant={user ? 'secondary' : 'primary'} href={ROUTES.konto} aria-current={route === 'konto' ? 'page' : undefined}>
        {user ? 'Konto' : 'Logga in'}</ButtonLink>} />
  );
}
