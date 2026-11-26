import { Hero } from '@frame/site';
import { Cities } from './Cities.tsx';
import { Plus } from './Plus.tsx';
import css from './Landing.module.css';

const POINTS = [
  { title: 'Alla källor', text: 'Annonser från Bostadsförmedlingen, HomeQ, Qasa, Samtrygg, Facebook m.m.' },
  { title: 'Informativ karta', text: 'Se restider från varje lägenhet till t.ex. arbetsplats, skola eller en vän du gärna bor nära, pris per m2 och lägenhetsstorlek direkt i kartan.' },
  { title: 'AI-drivet', text: 'Smart bearbetning av data från annonser med hjälp av AI.' },
];

/** The landing page: what it is, why it helps, one way in. */
export function Landing() {
  return (
    <div className={css.sections}>
        {/* The list goes in `actions`: Frame puts `lead` in a <p>, which cannot hold a <ul>. */}
        <Hero title="Alla hyresannonser på ett ställe."
          actions={<ul className={css.points}>{POINTS.map(p => <li key={p.title}><div><strong>{p.title}</strong><p>{p.text}</p></div></li>)}</ul>} />
      <Cities />
      <Plus />
    </div>
  );
}
