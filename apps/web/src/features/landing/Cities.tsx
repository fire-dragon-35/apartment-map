import { Grid, Stack } from '@frame/core';
import { Badge, Text } from '@frame/ui';
import { Section } from '@frame/site';
import { ROUTES } from '../../app/useRoute.ts';
import css from './Cities.module.css';
import landing from './Landing.module.css';

/** One photo card per city. A city without href is shown as coming soon. */
const CITIES = [
  { name: 'Stockholm', photo: css.stockholm, href: ROUTES.karta },
  { name: 'Göteborg', photo: css.goteborg },
];

/** App component: Frame has no image card. */
export function Cities() {
  return (
    <Section label="Kartor">
      <Stack gap={4}>
        <h2 className={landing.heading}>Kartor</h2>
        <Grid>
          {CITIES.map(c => {
            const body = (
              <Stack gap={2} align="start">
                {!c.href && <Badge>Kommer snart</Badge>}
                <Text as="span" size="xl" weight="semibold" className={css.name}>{c.name}</Text>
              </Stack>
            );
            const cls = `${css.card} ${c.photo}`;
            return (
              <Grid.Item key={c.name} span={{ base: 12, md: 6 }}>
                {c.href ? <a className={cls} href={c.href}>{body}</a> : <div className={cls} aria-disabled>{body}</div>}
              </Grid.Item>
            );
          })}
        </Grid>
      </Stack>
    </Section>
  );
}
