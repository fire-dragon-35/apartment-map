import { ButtonLink } from '@frame/ui';
import { CallToAction, ChipList, FeatureGrid, Hero } from '@frame/site';
import { ROUTES } from '../../app/useRoute.ts';
import { Cities } from './Cities.tsx';

const FEATURES = [
  { title: 'Restid med SL', text: 'Varje annons visar hur lång tid det tar att åka kollektivt till Karlaplan.' },
  { title: 'Pris per kvadratmeter', text: 'Färgen på pricken visar direkt vad som är dyrt och vad som är prisvärt.' },
  { title: 'Plus: din egen plats', text: 'Mät restiden till jobbet eller skolan, spara din sökning och få mejl när något nytt dyker upp.' },
];
const SOURCES = ['Bostadsförmedlingen', 'HomeQ', 'Qasa', 'Samtrygg'];

/** The landing page: what it is, why it helps, where the ads come from, one way in. */
export function Landing() {
  const open = <ButtonLink href={ROUTES.karta}>Öppna kartan</ButtonLink>;
  return (
    <>
      <Hero eyebrow="Hyresbostäder" title="Alla hyresannonser på en karta."
        lead="Se hyra, storlek och restid för varje lägenhet på ett ställe. Gratis, utan konto." actions={open} />
      <Cities />
      <FeatureGrid title="Det du får" items={FEATURES} />
      <ChipList title="Annonser från" items={SOURCES} />
      <CallToAction title="Hitta rätt läge" text="Annonserna uppdateras varje morgon." actions={open} />
    </>
  );
}
