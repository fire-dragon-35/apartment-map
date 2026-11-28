import type { ReactNode } from 'react';
import { Grid, Panel, Stack } from '@frame/core';
import { CheckList, Text } from '@frame/ui';
import { PLAN } from './plan.ts';

/** The one plan: what it adds beside the price, and optionally one action under the price. */
export function PlanCard({ action }: { action?: ReactNode }) {
  return (
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
              {action}
            </Stack>
          </Grid.Item>
        </Grid>
      </Stack>
    </Panel>
  );
}
