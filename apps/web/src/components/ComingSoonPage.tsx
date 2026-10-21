import { Stack, Text, Title } from '@mantine/core';

import type { ReactElement } from 'react';

/** Placeholder for routes whose feature arrives in a later phase. */
export function ComingSoonPage({ title }: { readonly title: string }): ReactElement {
  return (
    <Stack gap="xs">
      <Title order={2}>{title}</Title>
      <Text c="dimmed">This screen is built in a later phase.</Text>
    </Stack>
  );
}
