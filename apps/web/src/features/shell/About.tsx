import { Stack } from '@frame/core';
import { Heading, Text } from '@frame/ui';
import { DataSources } from '../data/DataSources.tsx';
import { CONTACT, PRIVACY, TERMS, type LegalDoc } from '../legal/texts.ts';
import { ContentPage } from './ContentPage.tsx';

/** The questions people ask before they sign up. Facts only; keep in step with the product. */
const FAQ = [
  { q: 'Vad kostar det?', a: 'Kartan är gratis. Plus kostar 299 kr i månaden och ger egen plats på kartan, sparad sökning, mejl om nya annonser och Sett: bocka för annonser du redan kollat, så blir de grå.' },
  { q: 'Var kommer annonserna ifrån?', a: 'Från Bostadsförmedlingen, HomeQ, Qasa och Samtrygg. Vi hämtar dem varje morgon; tabellen under Datakällor visar när varje sajt hämtades senast.' },
  { q: 'Hur räknas restiden?', a: 'Med kollektivtrafik och gång, dörr till dörr, för att vara framme 08:00 en vardag. Den räknas om varje natt.' },
  { q: 'Hur ansöker jag?', a: 'Hos källan: tryck på källans namn i annonsen. Vi är inte hyresvärd eller förmedlare.' },
  { q: 'Hur avslutar jag Plus?', a: 'Under Konto, "Hantera abonnemang". Plus gäller perioden ut, och inget mer dras.' },
];

/** A legal text in full, as a section of this page: no separate page, nothing hidden behind a link. */
function LegalSection({ id, doc }: { id: string; doc: LegalDoc }) {
  return (
    <Stack id={id} as="section" gap={4}>
      <Stack gap={1}>
        <Heading level={2}>{doc.title}</Heading>
        <Text size="xs" tone="muted">Senast ändrad {doc.updated}</Text>
      </Stack>
      <Text as="p" size="md" tone="secondary">{doc.intro}</Text>
      {doc.sections.map(s => (
        <Stack key={s.title} gap={2}>
          <Heading level={3}>{s.title}</Heading>
          {s.body.map(p => <Text as="p" size="md" key={p} tone="secondary">{p}</Text>)}
        </Stack>
      ))}
    </Stack>
  );
}

/** Om tjänsten: everything the footer links to is on this page, one section each (`#/om/fragor`, `#/om/villkor`, …). */
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
      <LegalSection id="integritet" doc={PRIVACY} />
      <LegalSection id="villkor" doc={TERMS} />
    </ContentPage>
  );
}
