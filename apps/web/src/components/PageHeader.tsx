import { Group, Title } from '@mantine/core';

import type { ReactElement, ReactNode } from 'react';

export function PageHeader({
  title,
  actions,
}: {
  readonly title: string;
  readonly actions?: ReactNode;
}): ReactElement {
  return (
    <Group justify="space-between" align="center">
      <Title order={2}>{title}</Title>
      {actions}
    </Group>
  );
}
