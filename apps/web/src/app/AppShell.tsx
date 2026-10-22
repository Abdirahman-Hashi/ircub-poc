import {
  AppShell as MantineAppShell,
  Burger,
  Group,
  Menu,
  NavLink,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronDown, IconKey, IconLogout, IconShieldLock } from '@tabler/icons-react';
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';

import { PERMISSIONS } from '@ircub/shared';

import { EscalationsBell } from '../components/EscalationsBell';
import { useAuth } from '../lib/auth';

import { NAV_ITEMS } from './nav';
import { filterNav, isNavActive } from './nav.rules';
import { ROUTES } from './routes.constants';

import type { ReactElement } from 'react';

const NAVBAR_WIDTH = 240;
const HEADER_HEIGHT = 56;
const ICON_SIZE = 16;

export function AppShellLayout(): ReactElement {
  const [opened, { toggle }] = useDisclosure();
  const { user, can, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const items = filterNav(NAV_ITEMS, can);

  const onLogout = async (): Promise<void> => {
    await logout();
    await navigate({ to: ROUTES.LOGIN });
  };

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
            {can(PERMISSIONS.PAYMENTS_SUPERVISE) && <EscalationsBell />}
            <Menu shadow="md" width={220}>
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="xs">
                    <Text size="sm">{user?.fullName ?? 'Account'}</Text>
                    <IconChevronDown size={ICON_SIZE} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{user?.email}</Menu.Label>
                <Menu.Item
                  component={Link}
                  to={ROUTES.ACCOUNT_PASSWORD}
                  leftSection={<IconKey size={ICON_SIZE} />}
                >
                  Change password
                </Menu.Item>
                <Menu.Item
                  component={Link}
                  to={ROUTES.ACCOUNT_MFA}
                  leftSection={<IconShieldLock size={ICON_SIZE} />}
                >
                  Two-factor authentication
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconLogout size={ICON_SIZE} />}
                  onClick={() => void onLogout()}
                >
                  Log out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
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
            active={isNavActive(pathname, item.to)}
          />
        ))}
      </MantineAppShell.Navbar>

      <MantineAppShell.Main>
        <Outlet />
      </MantineAppShell.Main>
    </MantineAppShell>
  );
}
