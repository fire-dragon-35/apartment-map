import { Grid, Panel, Stack } from '@frame/core';
import { ButtonLink, Text } from '@frame/ui';
import { Section } from '@frame/site';
import { ROUTES } from '../../app/useRoute.ts';
import css from './Plus.module.css';
import landing from './Landing.module.css';

const FEATURES = [
  { title: 'Din egen plats', text: 'Flytta pinnen från Karlaplan till jobbet, skolan eller en vän och se restiden från varje lägenhet dit.' },
  { title: 'Sparad sökning', text: 'Dina filter finns kvar nästa gång du öppnar kartan.' },
  { title: 'Mejl om nytt', text: 'Få ett mejl när en ny annons passar din sökning.' },
];

/** What Plus adds, and its price. Buying happens on the map page (pin bar). App component: Frame has no pricing card. */
export function Plus() {
  return (
    <Section label="Plus">
      <Stack gap={4}>
        <div className={css.brand}>
          <span className={css.mark} aria-hidden>✨</span>
          <h2 className={landing.heading}>Plus</h2>
        </div>
        <Panel>
          <Grid>
            <Grid.Item span={{ base: 12, md: 5 }}>
              <Stack gap={4} align="start">
                <Text as="p" tone="secondary">Kartan är gratis med restider till Karlaplan. Plus gör den till din.</Text>
                <div>
                  <span className={css.price}>299</span> <Text as="span" tone="secondary">kr/mån</Text>
                  <Text as="p" size="xs" tone="muted">Inklusive moms. Avsluta när du vill.</Text>
                </div>
                <ButtonLink href={ROUTES.karta}>Skaffa Plus</ButtonLink>
              </Stack>
            </Grid.Item>
            <Grid.Item span={{ base: 12, md: 7 }}>
              <ul className={css.features}>
                {FEATURES.map(f => (
                  <li key={f.title}>
                    <span className={css.check} aria-hidden>✓</span>
                    <Stack gap={1}>
                      <Text as="span" weight="semibold">{f.title}</Text>
                      <Text as="span" size="sm" tone="secondary">{f.text}</Text>
                    </Stack>
                  </li>
                ))}
              </ul>
            </Grid.Item>
        </Grid>
      </Panel>
      </Stack>
    </Section>
  );
}
