import { Grid, Panel, Stack } from '@frame/core';
import { ButtonLink, CheckList, Text } from '@frame/ui';
import { Section } from '@frame/site';
import { ROUTES } from '../../app/useRoute.ts';
import { PLAN } from '../plus/plan.ts';

/** What Plus adds, with the price beside it. Buying happens on the Plus page. */
export function Plus() {
  return (
    <Section align="center" size="narrow" title="Plus">
      <Panel>
        <Stack gap={6}>
          <Text as="p" size="md" tone="secondary" align="center">{PLAN.lead}</Text>
          <Grid gap={6}>
            <Grid.Item span={{ base: 12, md: 7 }}>
              <CheckList items={PLAN.features} />
            </Grid.Item>
            <Grid.Item span={{ base: 12, md: 5 }}>
              <Stack gap={3} align="center">
                <Stack gap={1} align="center">
                  <Text as="p" size="md" tone="secondary" align="center">
                    <Text size="xl" weight="bold">{PLAN.price}</Text> {PLAN.unit}
                  </Text>
                  <Text as="p" size="xs" tone="muted" align="center">{PLAN.note}</Text>
                </Stack>
                <ButtonLink href={ROUTES.plus}>Skaffa Plus</ButtonLink>
              </Stack>
            </Grid.Item>
          </Grid>
        </Stack>
      </Panel>
    </Section>
  );
}
