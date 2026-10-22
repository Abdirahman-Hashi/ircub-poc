import { Alert, Button, Card, Group, Select, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceMobile } from '@tabler/icons-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactElement, useMemo, useState } from 'react';

import { QUERY_KEYS } from '../../api/query-keys.constants';
import { getMyProfile } from '../../api/self.api';
import { ApiError } from '../../lib/api-error';
import { useLiveEvent } from '../../lib/live-events';
import { LIVE_EVENT } from '../../lib/live-events.constants';
import { ProfileView } from '../payers/PayerProfilePage';
import { InitiatePaymentModal } from '../payments/InitiatePaymentModal';
import { describeStatusChange } from '../payments/payments.rules';

import { payableTargets } from './self.rules';

import type { PayTarget } from '../payments/payments.types';

/** Customer portal: the payer linked to the signed-in user, with online payment (phase 4). */
export function MyProfilePage(): ReactElement {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: QUERY_KEYS.myProfile, queryFn: getMyProfile, retry: false });
  const [selected, setSelected] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const targets = useMemo<readonly PayTarget[]>(
    () => (profile.data === undefined ? [] : payableTargets(profile.data)),
    [profile.data],
  );
  const target = targets.find((t) => t.controlNumber === selected) ?? null;

  useLiveEvent((event) => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myProfile });
    if (event.type === LIVE_EVENT.PAYMENT_UPDATED) {
      const notice = describeStatusChange(event.data);
      if (notice !== null) {
        notifications.show({ color: notice.color, message: notice.message });
      }
    }
  });

  if (profile.isPending) {
    return <Text c="dimmed">Loading…</Text>;
  }
  if (profile.isError) {
    return (
      <Alert color="orange">
        {profile.error instanceof ApiError ? profile.error.message : 'Could not load your profile.'}
      </Alert>
    );
  }
  return (
    <Stack>
      <Card withBorder>
        <Group align="flex-end">
          <Select
            label="Pay online"
            placeholder={targets.length === 0 ? 'Nothing outstanding' : 'Choose what to pay'}
            data={targets.map((t) => ({ value: t.controlNumber, label: t.description }))}
            value={selected}
            onChange={setSelected}
            disabled={targets.length === 0}
            style={{ flex: 1 }}
          />
          <Button
            leftSection={<IconDeviceMobile size={16} />}
            disabled={target === null}
            onClick={() => {
              setPaying(true);
            }}
          >
            Pay by bank or mobile money
          </Button>
        </Group>
      </Card>
      <ProfileView profile={profile.data} canRegister={false} portal />
      <InitiatePaymentModal
        opened={paying}
        onClose={() => {
          setPaying(false);
        }}
        portal
        target={target}
        onInitiated={() => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myProfile })}
      />
    </Stack>
  );
}
