import { Container } from '@frame/core';
import { Text } from '@frame/ui';
import { ROUTES } from '../../app/useRoute.ts';
import styles from './Landing.module.css';

/** All text below is filler until the real copy exists. */
const STATS = [
  ['1 200+', 'annonser just nu'],
  ['4', 'källor, hämtade varje dag'],
  ['0 till 60 min', 'restid, dörr till dörr'],
  ['100 %', 'gratis att använda'],
] as const;

const STEPS = [
  ['1', 'Sätt dina gränser', 'Välj största hyra, storlek, antal rum och hur lång restid du vill ha.'],
  ['2', 'Se allt på kartan', 'Varje annons är en prick. Färgen visar kr/m², storleken visar yta.'],
  ['3', 'Gå till annonsen', 'Hitta något bra? Ett tryck tar dig till källan, där du ansöker.'],
] as const;

const FEATURES = [
  ['Restid som räknas', 'Kollektivtrafik från dörr till dörr, inte fågelvägen.'],
  ['Pris per kvadratmeter', 'Se direkt vad som är dyrt och vad som är en bra affär.'],
  ['Nya annonser först', 'Det som kom in sedan sist är markerat.'],
  ['Utan dubbletter', 'Samma lägenhet på flera sajter visas en gång.'],
  ['Resvägen på kartan', 'Rita linjen från lägenheten till Karlaplan med ett tryck.'],
  ['Öppen om sina källor', 'Vi visar när varje sajt hämtades senast och om något saknas.'],
] as const;

const SOURCES = ['Bostadsförmedlingen', 'HomeQ', 'Qasa', 'Samtrygg'] as const;

export function Landing() {
  return (
    <>
      <section className={styles.hero}>
        <Container size="wide">
          <div className={styles.heroText}>
            <Text size="sm" weight="semibold" className={styles.eyebrow}>Hyresbostäder i Stockholm</Text>
            <h1 className={styles.title}>Hitta lägenheten som ligger rätt, inte bara billigt.</h1>
            <Text as="p" size="lg" tone="secondary">
              Alla hyresannonser från flera sajter på en karta, med restid till Karlaplan och pris per kvadratmeter.
            </Text>
            <div className={styles.actions}>
              <a href={ROUTES.karta} className={styles.primary}>Öppna kartan</a>
              <a href={ROUTES['skapa-konto']} className={styles.secondary}>Skapa konto</a>
            </div>
          </div>
        </Container>
      </section>

      <section aria-label="Nyckeltal" className={styles.band}>
        <Container size="wide">
          <dl className={styles.stats}>
            {STATS.map(([value, label]) => (
              <div key={label} className={styles.stat}>
                <dt className={styles.statValue}>{value}</dt>
                <dd className={styles.statLabel}>{label}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      <section className={styles.section}>
        <Container size="wide">
          <h2 className={styles.heading}>Så fungerar det</h2>
          <ol className={styles.steps}>
            {STEPS.map(([n, title, text]) => (
              <li key={n} className={styles.card}>
                <span className={styles.number}>{n}</span>
                <Text as="h3" size="md" weight="semibold">{title}</Text>
                <Text as="p" size="sm" tone="secondary">{text}</Text>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className={styles.section}>
        <Container size="wide">
          <h2 className={styles.heading}>Det du får</h2>
          <ul className={styles.features}>
            {FEATURES.map(([title, text]) => (
              <li key={title} className={styles.feature}>
                <Text as="h3" size="md" weight="semibold">{title}</Text>
                <Text as="p" size="sm" tone="secondary">{text}</Text>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className={styles.section}>
        <Container size="wide">
          <h2 className={styles.heading}>Annonser från</h2>
          <ul className={styles.sources}>
            {SOURCES.map(s => <li key={s} className={styles.source}>{s}</li>)}
          </ul>
        </Container>
      </section>

      <section className={styles.section}>
        <Container size="wide">
          <div className={styles.cta}>
            <h2 className={styles.heading}>Redo att leta?</h2>
            <Text as="p" size="md" tone="secondary">Kartan är öppen för alla. Konto behövs först när bevakningar kommer.</Text>
            <a href={ROUTES.karta} className={styles.primary}>Öppna kartan</a>
          </div>
        </Container>
      </section>
    </>
  );
}
