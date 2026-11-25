import { AppShell, Container } from '@frame/core';
import { Footer } from '../features/shell/Footer.tsx';
import { Navbar } from '../features/shell/Navbar.tsx';
import { Landing } from '../features/landing/Landing.tsx';
import { ComingSoon } from '../features/shell/ComingSoon.tsx';
import { Account } from '../features/shell/Account.tsx';
import { MapPage } from './MapPage.tsx';
import { useRoute } from './useRoute.ts';

/** The frame around every page: navbar on top, footer below. The map page keeps its one narrow column (DESIGN.md §4), the rest are wide. */
export function App() {
  const route = useRoute();
  const size = route === 'karta' ? 'default' : 'wide';
  return (
    <AppShell navigation={<Navbar route={route} size={size} />}>
      {route === 'karta' ? <Container size={size}><MapPage /></Container>
        : route === 'hem' ? <Landing />
        : route === 'logga-in' ? <Account title="Logga in" />
        : route === 'skapa-konto' ? <Account title="Skapa konto" />
        : <ComingSoon route={route} />}
      <Footer size={size} />
    </AppShell>
  );
}
