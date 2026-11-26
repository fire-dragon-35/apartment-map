import type { ReactNode } from 'react';
import { Container, Page } from '@frame/core';
import { Heading, Text } from '@frame/ui';

/** Every text page (about, legal, account, placeholders): one narrow column, a centred page title and lead. */
export function ContentPage({ title, lead, children }: { title: string; lead?: ReactNode; children?: ReactNode }) {
  return (
    <Container size="narrow">
      <Page>
        <Page.Header align="center">
          <Heading level={1}>{title}</Heading>
          {lead && <Text as="p" size="md" tone="secondary">{lead}</Text>}
        </Page.Header>
        {children && <Page.Content>{children}</Page.Content>}
      </Page>
    </Container>
  );
}
