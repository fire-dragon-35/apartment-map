import { Container } from '@frame/core';
import { Text } from '@frame/ui';
import { ROUTES, type RouteId } from '../../app/useRoute.ts';
import styles from './ComingSoon.module.css';

const TITLES: Partial<Record<RouteId, string>> = {
  om: 'Om tjänsten',
  'logga-in': 'Logga in',
  'skapa-konto': 'Skapa konto',
};

/** Placeholder for every page that is not built yet (and for an unknown address). */
export function ComingSoon({ route }: { route: RouteId }) {
  const unknown = route === 'okand';
  return (
    <Container size="narrow">
      <div className={styles.box}>
        <h1>{unknown ? 'Sidan finns inte' : TITLES[route]}</h1>
        <Text as="p" size="md" tone="secondary">{unknown ? 'Adressen stämmer inte med någon sida.' : 'Den här sidan är på väg.'}</Text>
        <a href={ROUTES.hem} className={styles.back}>Till startsidan</a>
      </div>
    </Container>
  );
}
