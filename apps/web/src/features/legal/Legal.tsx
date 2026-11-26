import { Container, Stack } from '@frame/core';
import { Text } from '@frame/ui';
import type { LegalDoc } from './texts.ts';

/** A legal page: title, date, intro, then one heading and paragraphs per section. */
export function Legal({ doc }: { doc: LegalDoc }) {
  return (
    <Container size="narrow">
      <Stack gap={4}>
        <Stack gap={1}>
          <h1>{doc.title}</h1>
          <Text size="xs" tone="muted">Senast ändrad {doc.updated}</Text>
        </Stack>
        <Text as="p" tone="secondary">{doc.intro}</Text>
        {doc.sections.map(s => (
          <Stack key={s.title} as="section" gap={2}>
            <Text as="h2" size="md" weight="semibold">{s.title}</Text>
            {s.body.map(p => <Text as="p" key={p} tone="secondary">{p}</Text>)}
          </Stack>
        ))}
      </Stack>
    </Container>
  );
}
