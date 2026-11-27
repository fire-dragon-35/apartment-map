import { AppShell, Container } from '@frame/core';
import { Footer } from '../features/shell/Footer.tsx';
import { Navbar } from '../features/shell/Navbar.tsx';
import { Landing } from '../features/landing/Landing.tsx';
import { ComingSoon } from '../features/shell/ComingSoon.tsx';
import { About } from '../features/shell/About.tsx';
import { Account } from '../features/shell/Account.tsx';
import { MapPage } from './MapPage.tsx';
import { PlusPage } from '../features/plus/PlusPage.tsx';
import { useRoute } from './useRoute.ts';

/** The frame around every page: navbar on top and footer below (both always wide). The map page keeps its one narrow column (DESIGN.md §4), the rest are wide. */
export function App() {
  const route = useRoute();
  const size = route === 'karta' ? 'default' : 'wide';
  return (
    <AppShell navigation={<Navbar route={route} />} footer={<Footer />}>
      {route === 'karta' ? <Container size={size}><MapPage /></Container>
        : route === 'hem' ? <Landing />
        : route === 'om' ? <About />
        : route === 'plus' ? <PlusPage />
        : route === 'logga-in' ? <Account title="Logga in" />
        : route === 'skapa-konto' ? <Account title="Skapa konto" />
        : <ComingSoon route={route} />}
    </AppShell>
  );
}
