import { Stack } from '@frame/core';
import { ButtonLink } from '@frame/ui';
import { CallToAction, ChipList, FeatureGrid, Hero } from '@frame/site';
import { ROUTES } from '../../app/useRoute.ts';
import { Cities } from './Cities.tsx';
import css from './Landing.module.css';

const POINTS = [
  'Annonser från Bostadsförmedlingen, HomeQ, Qasa, Samtrygg, Facebook m.m.',
  'Se restider från varje lägenhet till t.ex. arbetsplats, skola eller en nära vän du gärna hade bott nära.',
  'Smart bearbetning av data från annonser med hjälp av AI.',
];
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
    <Stack gap={8}>
      <div className={css.hero}>
        {/* The list goes in `actions`: Frame puts `lead` in a <p>, which cannot hold a <ul>. */}
        <Hero title="Alla hyresannonser på ett ställe."
          actions={<ul className={css.points}>{POINTS.map(p => <li key={p}>{p}</li>)}</ul>} />
      </div>
      <Cities />
      <FeatureGrid title="Det du får" items={FEATURES} />
      <ChipList title="Annonser från" items={SOURCES} />
      <CallToAction title="Hitta rätt läge" text="Annonserna uppdateras varje morgon." actions={open} />
    </Stack>
  );
}
