import {
  AppShell as MantineAppShell,
  Burger,
  Button,
  Group,
  NavLink,
  Text,
  Title,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconLogout } from '@tabler/icons-react';
import { Link, Outlet, useRouterState } from '@tanstack/react-router';

import { useAuth } from '../lib/auth';

import { NAV_ITEMS } from './nav';
import { filterNav } from './nav.rules';

import type { ReactElement } from 'react';

const NAVBAR_WIDTH = 240;
const HEADER_HEIGHT = 56;

export function AppShellLayout(): ReactElement {
  const [opened, { toggle }] = useDisclosure();
  const { user, can, logout } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const items = filterNav(NAV_ITEMS, can);

  return (
    <MantineAppShell
      header={{ height: HEADER_HEIGHT }}
      navbar={{ width: NAVBAR_WIDTH, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <MantineAppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={4}>IRCUB</Title>
          </Group>
          <Group gap="sm">
            <Text size="sm" c="dimmed">
              {user?.displayName ?? 'Not signed in'}
            </Text>
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconLogout size={16} />}
              onClick={() => void logout()}
            >
              Log out
            </Button>
          </Group>
        </Group>
      </MantineAppShell.Header>

      <MantineAppShell.Navbar p="xs">
        {items.map((item) => (
          <NavLink
            key={item.to}
            component={Link}
            to={item.to}
            label={item.label}
            leftSection={<item.icon size={18} />}
            active={pathname.startsWith(item.to)}
          />
        ))}
      </MantineAppShell.Navbar>

      <MantineAppShell.Main>
        <Outlet />
      </MantineAppShell.Main>
    </MantineAppShell>
  );
}
