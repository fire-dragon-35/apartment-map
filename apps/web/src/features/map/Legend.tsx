import { Stack } from '@frame/core';
import { Badge, Text } from '@frame/ui';
import { PRICE_BANDS } from '@lk/shared';

/** DESIGN.md §4.3: one wrapping T3 line. */
export function Legend() {
  return (
    <Stack id="legend" direction="row" gap={2} wrap>
      {PRICE_BANDS.map(b => (
        <Stack as="span" key={b.label} direction="row" gap={1} align="center">
          <Badge tone="custom" shape="dot" background={b.color} />
          <Text size="xs" tone="muted" nowrap>{b.label}</Text>
        </Stack>
      ))}
      <Text size="xs" tone="muted">större prick = fler m²</Text>
      <Text size="xs" tone="muted">restid: SL dörr till dörr, framme 08:00 nästa vardag</Text>
    </Stack>
  );
}
