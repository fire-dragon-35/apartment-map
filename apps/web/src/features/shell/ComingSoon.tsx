import { ButtonLink } from '@frame/ui';
import { ROUTES } from '../../app/useRoute.ts';
import { ContentPage } from './ContentPage.tsx';

/** An address that matches no page. */
export function ComingSoon() {
  return (
    <ContentPage title="Sidan finns inte" lead="Adressen stämmer inte med någon sida.">
      <div><ButtonLink variant="secondary" href={ROUTES.hem}>Till startsidan</ButtonLink></div>
    </ContentPage>
  );
}
