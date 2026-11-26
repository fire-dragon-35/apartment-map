import { Hero, Section } from '@frame/site';
import { Cities } from './Cities.tsx';
import { MapExample } from './MapExample.tsx';
import { Plus } from './Plus.tsx';

const POINTS = [
  { title: 'Alla källor', text: 'Annonser från Bostadsförmedlingen, HomeQ, Qasa, Samtrygg, Facebook m.m.' },
  { title: 'Informativ karta', text: 'Se restider från varje lägenhet till t.ex. arbetsplats, skola eller en vän du gärna bor nära, pris per m2 och lägenhetsstorlek direkt i kartan.' },
  { title: 'AI-drivet', text: 'Smart bearbetning av data från annonser med hjälp av AI.' },
];

/** The landing page: Frame blocks only, so spacing and type come from Frame. */
export function Landing() {
  return (
    <>
      <Hero title="Alla hyresannonser på ett ställe." points={POINTS} />
      <Section label="Så ser kartan ut"><MapExample /></Section>
      <Cities />
      <Plus />
    </>
  );
}
