import { Grid } from '@frame/core';
import { MediaCard, Section } from '@frame/site';
import { ROUTES } from '../../app/useRoute.ts';

/** One photo card per city. A city without href is shown as coming soon. */
const CITIES = [
  { name: 'Stockholm', image: '/cities/stockholm.webp', href: ROUTES.karta },
  { name: 'Göteborg', image: '/cities/goteborg.webp' },
  { name: 'Malmö', image: '/cities/malmo.webp' },
];

export function Cities() {
  return (
    <Section align="center" size="narrow" title="Kartor">
      <Grid>
        {CITIES.map(c => (
          <Grid.Item key={c.name} span={{ base: 12, md: 4 }}>
            <MediaCard ratio="landscape" title={c.name} image={c.image} href={c.href} note={c.href ? undefined : 'Kommer snart'} />
          </Grid.Item>
        ))}
      </Grid>
    </Section>
  );
}
