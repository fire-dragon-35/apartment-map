import { Stack } from '@frame/core';
import { Heading, Text } from '@frame/ui';
import { ContentPage } from '../shell/ContentPage.tsx';
import type { LegalDoc } from './texts.ts';

/** A legal page: title, date and intro, then one heading and paragraphs per section. */
export function Legal({ doc }: { doc: LegalDoc }) {
  return (
    <ContentPage title={doc.title} lead={doc.intro}>
      <Text size="xs" tone="muted">Senast ändrad {doc.updated}</Text>
      {doc.sections.map(s => (
        <Stack key={s.title} as="section" gap={2}>
          <Heading level={3} as="h2">{s.title}</Heading>
          {s.body.map(p => <Text as="p" size="md" key={p} tone="secondary">{p}</Text>)}
        </Stack>
      ))}
    </ContentPage>
  );
}
