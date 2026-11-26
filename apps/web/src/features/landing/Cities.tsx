import { Grid, Stack } from '@frame/core';
import { Badge, Text } from '@frame/ui';
import { Section } from '@frame/site';
import { ROUTES } from '../../app/useRoute.ts';
import css from './Cities.module.css';

/** One card per city. A city without href is shown as coming soon. */
const CITIES = [
  { name: 'Stockholmskartan', href: ROUTES.karta, photo: css.stockholm },
  { name: 'Göteborgskartan' },
];

/** App component: Frame has no image card. Photo banner links to the city's map. */
export function Cities() {
  return (
    <Section label="Städer">
      <Grid>
        {CITIES.map(c => (
          <Grid.Item key={c.name} span={{ base: 12, md: 6 }}>
            {c.href
              ? <a className={`${css.card} ${c.photo}`} href={c.href}>
                  <Text as="span" size="xl" weight="semibold" className={css.name}>{c.name}</Text>
                </a>
              : <div className={`${css.card} ${css.soon}`}>
                  <Stack gap={2} align="start">
                    <Text as="span" size="xl" weight="semibold">{c.name}</Text>
                    <Badge>Kommer snart</Badge>
                  </Stack>
                </div>}
          </Grid.Item>
        ))}
      </Grid>
    </Section>
  );
}
