import { ButtonLink } from '@frame/ui';
import { Pricing, Section } from '@frame/site';
import { ROUTES } from '../../app/useRoute.ts';
import { PLAN } from '../plus/plan.ts';

/** What Plus adds, and its price. Buying happens on the Plus page. */
export function Plus() {
  return (
    <Section align="center" size="narrow" title="Plus">
      <Pricing lead={PLAN.lead} price={PLAN.price} unit={PLAN.unit} note={PLAN.note}
        action={<ButtonLink href={ROUTES.plus}>Skaffa Plus</ButtonLink>} features={PLAN.features} />
    </Section>
  );
}
