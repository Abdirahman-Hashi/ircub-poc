import { ActionIcon, Indicator, Menu, Text } from '@mantine/core';
import { IconBell } from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';

import { PaymentStatus } from '@ircub/shared';

import { ROUTES } from '../app/routes.constants';
import { useLiveEvents } from '../lib/live-events';

import type { PaymentsSearch } from '../app/router.types';
import type { ReactElement } from 'react';

const ICON_SIZE = 18;

/** Supervisor bell: payments that exhausted their status checks during this session. */
export function EscalationsBell(): ReactElement {
  const { escalations, clearEscalations, connected } = useLiveEvents();
  const navigate = useNavigate();
  return (
    <Menu shadow="md" width={320}>
      <Menu.Target>
        <Indicator
          label={escalations.length}
          size={16}
          color="red"
          disabled={escalations.length === 0}
        >
          <ActionIcon
            variant="subtle"
            color={connected ? 'gray' : 'orange'}
            aria-label="Escalations"
            title={connected ? 'Live updates connected' : 'Live updates disconnected'}
          >
            <IconBell size={ICON_SIZE} />
          </ActionIcon>
        </Indicator>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Permanently failed payments</Menu.Label>
        {escalations.length === 0 ? (
          <Menu.Item disabled>
            <Text size="sm" c="dimmed">
              Nothing new this session
            </Text>
          </Menu.Item>
        ) : (
          escalations.map((item) => (
            <Menu.Item
              key={item.paymentId}
              onClick={() =>
                void navigate({
                  to: ROUTES.PAYMENTS,
                  search: { paymentId: item.paymentId } as PaymentsSearch,
                })
              }
            >
              <Text size="sm" ff="monospace">
                {item.controlNumber}
              </Text>
              <Text size="xs" c="dimmed">
                no answer after {item.attempts} status checks
              </Text>
            </Menu.Item>
          ))
        )}
        <Menu.Divider />
        <Menu.Item
          onClick={() =>
            void navigate({
              to: ROUTES.PAYMENTS,
              search: { status: PaymentStatus.PERMANENTLY_FAILED } as PaymentsSearch,
            })
          }
        >
          View all permanently failed
        </Menu.Item>
        {escalations.length > 0 && <Menu.Item onClick={clearEscalations}>Clear</Menu.Item>}
      </Menu.Dropdown>
    </Menu>
  );
}
