import { ButtonLink } from '@frame/ui';
import { Pricing, Section } from '@frame/site';
import { ROUTES } from '../../app/useRoute.ts';

const FEATURES = [
  { title: 'Din egen plats', text: 'Flytta pinnen från Karlaplan till jobbet, skolan eller en vän och se restiden från varje lägenhet dit.' },
  { title: 'Sparad sökning', text: 'Dina filter finns kvar nästa gång du öppnar kartan.' },
  { title: 'Mejl om nytt', text: 'Få ett mejl när en ny annons passar din sökning.' },
];

/** What Plus adds, and its price. Buying happens on the map page (pin bar). */
export function Plus() {
  return (
    <Section title="Plus">
      <Pricing lead="Kartan är gratis med restider till Karlaplan. Plus gör den till din."
        price="299" unit="kr/mån" note="Inklusive moms. Avsluta när du vill."
        action={<ButtonLink href={ROUTES.karta}>Skaffa Plus</ButtonLink>} features={FEATURES} />
    </Section>
  );
}
