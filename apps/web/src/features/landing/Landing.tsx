import { ButtonLink } from '@frame/ui';
import { CallToAction, ChipList, FeatureGrid, Hero, Stats, Steps } from '@frame/site';
import { ROUTES } from '../../app/useRoute.ts';

/** All text below is filler until the real copy exists. */
const STATS = [
  { value: '1 200+', label: 'annonser just nu' },
  { value: '4', label: 'källor, hämtade varje dag' },
  { value: '0 till 60 min', label: 'restid, dörr till dörr' },
  { value: '100 %', label: 'gratis att använda' },
];
const STEPS = [
  { title: 'Sätt dina gränser', text: 'Välj största hyra, storlek, antal rum och hur lång restid du vill ha.' },
  { title: 'Se allt på kartan', text: 'Varje annons är en prick. Färgen visar kr/m², storleken visar yta.' },
  { title: 'Gå till annonsen', text: 'Hitta något bra? Ett tryck tar dig till källan, där du ansöker.' },
];
const FEATURES = [
  { title: 'Restid som räknas', text: 'Kollektivtrafik från dörr till dörr, inte fågelvägen.' },
  { title: 'Pris per kvadratmeter', text: 'Se direkt vad som är dyrt och vad som är en bra affär.' },
  { title: 'Nya annonser först', text: 'Det som kom in sedan sist är markerat.' },
  { title: 'Utan dubbletter', text: 'Samma lägenhet på flera sajter visas en gång.' },
  { title: 'Resvägen på kartan', text: 'Rita linjen från lägenheten till Karlaplan med ett tryck.' },
  { title: 'Öppen om sina källor', text: 'Vi visar när varje sajt hämtades senast och om något saknas.' },
];
const SOURCES = ['Bostadsförmedlingen', 'HomeQ', 'Qasa', 'Samtrygg'];

/** The landing page, composed from Frame's site blocks. */
export function Landing() {
  const open = <ButtonLink href={ROUTES.karta}>Öppna kartan</ButtonLink>;
  return (
    <>
      <Hero eyebrow="Hyresbostäder i Stockholm" title="Hitta lägenheten som ligger rätt, inte bara billigt."
        lead="Alla hyresannonser från flera sajter på en karta, med restid till Karlaplan och pris per kvadratmeter."
        actions={<>{open}<ButtonLink variant="secondary" href={ROUTES['skapa-konto']}>Skapa konto</ButtonLink></>} />
      <Stats label="Nyckeltal" items={STATS} />
      <Steps title="Så fungerar det" items={STEPS} />
      <FeatureGrid title="Det du får" items={FEATURES} />
      <ChipList title="Annonser från" items={SOURCES} />
      <CallToAction title="Redo att leta?" text="Kartan är öppen för alla. Konto behövs först när bevakningar kommer." actions={open} />
    </>
  );
}
