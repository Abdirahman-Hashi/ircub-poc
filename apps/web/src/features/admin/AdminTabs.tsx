import { Tabs } from '@mantine/core';
import { useNavigate, useRouterState } from '@tanstack/react-router';

import { ROUTES } from '../../app/routes.constants';

import type { ReactElement } from 'react';

const TABS = [
  { value: ROUTES.ADMIN_USERS, label: 'Users' },
  { value: ROUTES.ADMIN_ROLES, label: 'Roles & permissions' },
  { value: ROUTES.ADMIN_SOD, label: 'Segregation of duties' },
  { value: ROUTES.ADMIN_CONFIG, label: 'System configuration' },
] as const;

export function AdminTabs(): ReactElement {
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
