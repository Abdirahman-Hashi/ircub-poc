import { Badge, Button, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { Link, Navigate } from '@tanstack/react-router';

import { PERMISSIONS } from '@ircub/shared';

import { NAV_ITEMS } from '../../app/nav';
import { filterNav } from '../../app/nav.rules';
import { ROUTES } from '../../app/routes.constants';
import { useAuth } from '../../lib/auth';

import type { ReactElement } from 'react';

/** Landing page per role: the screens this user can open. Phase 6 replaces it with the dashboard. */
export function HomePage(): ReactElement {
  const { user, roles, can } = useAuth();
  const items = filterNav(NAV_ITEMS, can);
  if (can(PERMISSIONS.DASHBOARD_VIEW)) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }
  return (
    <Stack>
      <div>
        <Title order={2}>Welcome{user === null ? '' : `, ${user.fullName}`}</Title>
        <Group gap="xs" mt="xs">
          {roles.map((role) => (
            <Badge key={role.id} variant="light">
              {role.name}
            </Badge>
          ))}
        </Group>
      </div>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {items.map((item) => (
          <Card key={item.to} withBorder>
            <Group justify="space-between">
              <Group gap="sm">
                <item.icon size={20} />
                <Text fw={500}>{item.label}</Text>
              </Group>
              <Button component={Link} to={item.to} size="xs" variant="light">
                Open
              </Button>
            </Group>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  );
}
