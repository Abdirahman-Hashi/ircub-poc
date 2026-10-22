import { Tabs } from '@mantine/core';
import { useNavigate, useRouterState } from '@tanstack/react-router';

import { ROUTES } from '../../app/routes.constants';

import type { ReactElement } from 'react';

const TABS = [
  { value: ROUTES.FMIS, label: 'Journal batches' },
  { value: ROUTES.FMIS_RECONCILIATION, label: 'Reconciliation' },
  { value: ROUTES.FMIS_MAPPINGS, label: 'GL mappings' },
] as const;

export function FmisTabs(): ReactElement {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <Tabs
      value={pathname}
      onChange={(value) => void navigate({ to: value as (typeof TABS)[number]['value'] })}
      mb="md"
    >
      <Tabs.List>
        {TABS.map((tab) => (
          <Tabs.Tab key={tab.value} value={tab.value}>
            {tab.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs>
  );
}
