import { Badge } from '@mantine/core';

import { DEFAULT_STATUS_COLOR, STATUS_COLORS } from './StatusBadge.constants';

import type { ReactElement } from 'react';

export function StatusBadge({ status }: { readonly status: string }): ReactElement {
  return (
    <Badge color={STATUS_COLORS[status] ?? DEFAULT_STATUS_COLOR} variant="light">
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}
