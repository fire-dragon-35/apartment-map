import { ButtonLink } from '@frame/ui';
import { Section } from '@frame/site';
import { ROUTES } from '../../app/useRoute.ts';
import { PlanCard } from '../plus/PlanCard.tsx';

/** What Plus adds, with the price beside it. Buying happens on the Plus page. */
export function Plus() {
  return (
    <Section align="center" size="narrow" title="Plus">
      <PlanCard action={<ButtonLink href={ROUTES.plus}>Skaffa Plus</ButtonLink>} />
    </Section>
  );
}
