import { ButtonLink } from '@frame/ui';
import { ROUTES, type RouteId } from '../../app/useRoute.ts';
import { ContentPage } from './ContentPage.tsx';

const TITLES: Partial<Record<RouteId, string>> = {
  'logga-in': 'Logga in',
  'skapa-konto': 'Skapa konto',
};

/** Placeholder for every page that is not built yet (and for an unknown address). */
export function ComingSoon({ route }: { route: RouteId }) {
  const unknown = route === 'okand';
  return (
    <ContentPage title={unknown ? 'Sidan finns inte' : TITLES[route] ?? ''}
      lead={unknown ? 'Adressen stämmer inte med någon sida.' : 'Den här sidan är på väg.'}>
      <div><ButtonLink variant="secondary" href={ROUTES.hem}>Till startsidan</ButtonLink></div>
    </ContentPage>
  );
}
