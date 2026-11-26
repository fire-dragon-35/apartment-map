import { Stack } from '@frame/core';
import { ButtonLink, Heading, Text } from '@frame/ui';
import { ROUTES } from '../../app/useRoute.ts';
import { DataSources } from '../data/DataSources.tsx';
import { CONTACT } from '../legal/texts.ts';
import { ContentPage } from './ContentPage.tsx';

/** The questions people ask before they sign up. Facts only; keep in step with the product. */
const FAQ = [
  { q: 'Vad kostar det?', a: 'Kartan är gratis. Plus kostar 299 kr i månaden och ger egen plats på kartan, sparad sökning och mejl om nya annonser.' },
  { q: 'Var kommer annonserna ifrån?', a: 'Från Bostadsförmedlingen, HomeQ, Qasa och Samtrygg. Vi hämtar dem varje morgon; tabellen under Datakällor visar när varje sajt hämtades senast.' },
  { q: 'Hur räknas restiden?', a: 'Med kollektivtrafik och gång, dörr till dörr, för att vara framme 08:00 en vardag. Den räknas om varje natt.' },
  { q: 'Hur ansöker jag?', a: 'Hos källan: tryck på källans namn i annonsen. Vi är inte hyresvärd eller förmedlare.' },
  { q: 'Hur avslutar jag Plus?', a: 'Under Konto, "Hantera abonnemang". Plus gäller perioden ut, och inget mer dras.' },
];

/** Om tjänsten: everything the footer links to lives here, one section each (`#/om/fragor`, `#/om/kontakt`, …). */
export function About() {
  return (
    <ContentPage title="Om tjänsten" lead="EnkelLGH samlar hyresannonser från flera sajter på en karta, med restid och pris per kvadratmeter.">
      <Stack id="fragor" as="section" gap={4}>
        <Heading level={2}>Vanliga frågor</Heading>
        {FAQ.map(f => (
          <Stack key={f.q} gap={1}>
            <Heading level={3}>{f.q}</Heading>
            <Text as="p" size="md" tone="secondary">{f.a}</Text>
          </Stack>
        ))}
      </Stack>
      <Stack id="kontakt" as="section" gap={2}>
        <Heading level={2}>Kontakt</Heading>
        <Text as="p" size="md" tone="secondary">Frågor, fel i en annons eller en annons som ska bort: mejla {CONTACT}.</Text>
      </Stack>
      <div id="data"><DataSources /></div>
      <Stack id="juridiskt" as="section" gap={2} align="start">
        <Heading level={2}>Juridiskt</Heading>
        <Stack direction="row" gap={2} wrap>
          <ButtonLink variant="secondary" href={ROUTES.integritet}>Integritetspolicy</ButtonLink>
          <ButtonLink variant="secondary" href={ROUTES.villkor}>Villkor</ButtonLink>
        </Stack>
      </Stack>
    </ContentPage>
  );
}
