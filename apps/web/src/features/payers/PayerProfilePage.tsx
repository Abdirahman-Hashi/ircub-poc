import { Badge, Button, Card, Group, SimpleGrid, Stack, Table, Tabs, Text } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';

import { PayerStatus, PERMISSIONS } from '@ircub/shared';

import { getPayerProfile, reactivatePayer, suspendPayer } from '../../api/payers.api';
import { QUERY_KEYS } from '../../api/query-keys.constants';
import { MoneyText } from '../../components/MoneyText';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { useCan } from '../../lib/auth';
import { formatDate, formatDateTime } from '../../lib/format';
import { notifyError, notifySuccess } from '../../lib/notify';

import type { PayerProfile } from '../../api/types';
import type { ReactElement } from 'react';

const LOCAL_CURRENCY_FALLBACK = 'SOS';
const WEIGHT_BOLD = 700;
const WEIGHT_MEDIUM = 500;

export function PayerProfilePage(): ReactElement {
  const payerId = useParams({ strict: false }).payerId ?? '';
  const queryClient = useQueryClient();
  const canRegister = useCan(PERMISSIONS.PAYERS_REGISTER);
  const profile = useQuery({
    queryKey: QUERY_KEYS.payer(payerId),
    queryFn: () => getPayerProfile(payerId),
  });
  const toggle = useMutation({
    mutationFn: (status: PayerStatus) =>
      status === PayerStatus.ACTIVE ? suspendPayer(payerId) : reactivatePayer(payerId),
    onSuccess: async (updated) => {
      notifySuccess(`Payer is now ${updated.status.toLowerCase()}`);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.payer(payerId) });
    },
    onError: notifyError,
  });

  if (profile.isPending) {
    return <Text c="dimmed">Loading…</Text>;
  }
  if (profile.isError) {
    return <Text c="red">Could not load payer.</Text>;
  }
  return (
    <ProfileView
      profile={profile.data}
      canRegister={canRegister}
      onToggle={() => {
        toggle.mutate(profile.data.payer.status);
      }}
      toggling={toggle.isPending}
    />
  );
}

export function ProfileView({
  profile,
  canRegister,
  onToggle,
  toggling,
}: {
  readonly profile: PayerProfile;
  readonly canRegister: boolean;
  readonly onToggle?: () => void;
  readonly toggling?: boolean;
}): ReactElement {
  const { payer, balances } = profile;
  const currency = profile.assessments[0]?.currency ?? LOCAL_CURRENCY_FALLBACK;
  return (
    <Stack>
      <PageHeader
        title={payer.name}
        actions={
          canRegister && onToggle !== undefined ? (
            <Button
              variant="light"
              color={payer.status === PayerStatus.ACTIVE ? 'red' : 'teal'}
              onClick={onToggle}
              loading={toggling === true}
            >
              {payer.status === PayerStatus.ACTIVE ? 'Suspend' : 'Reactivate'}
            </Button>
          ) : null
        }
      />
      <Group gap="xs">
        <Badge variant="light">{payer.type}</Badge>
        <StatusBadge status={payer.status} />
        <Text ff="monospace">{payer.tin}</Text>
        <Text c="dimmed">·</Text>
        <Text>{payer.phone}</Text>
        {payer.email !== null && <Text c="dimmed">· {payer.email}</Text>}
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <SummaryCard label="Assessed" amount={balances.assessedTotal} currency={currency} />
        <SummaryCard label="Paid" amount={balances.paidTotal} currency={currency} />
        <SummaryCard
          label="Outstanding"
          amount={balances.outstanding}
          currency={currency}
          highlight
        />
      </SimpleGrid>
      <Tabs defaultValue="assessments">
        <Tabs.List>
          <Tabs.Tab value="assessments">Assessments ({profile.assessments.length})</Tabs.Tab>
          <Tabs.Tab value="water">Water accounts ({profile.waterAccounts.length})</Tabs.Tab>
          <Tabs.Tab value="payments">Payments ({profile.payments.length})</Tabs.Tab>
          <Tabs.Tab value="balance">Balance</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="assessments" pt="md">
          <Table withTableBorder striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Control number</Table.Th>
                <Table.Th>Revenue type</Table.Th>
                <Table.Th>Period</Table.Th>
                <Table.Th ta="right">Amount</Table.Th>
                <Table.Th ta="right">Outstanding</Table.Th>
                <Table.Th>Due</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {profile.assessments.map((a) => (
                <Table.Tr key={a.id}>
                  <Table.Td ff="monospace">{a.controlNumber}</Table.Td>
                  <Table.Td>{a.revenueType.name}</Table.Td>
                  <Table.Td>{a.period ?? '—'}</Table.Td>
                  <Table.Td>
                    <MoneyText amount={a.amount} currency={a.currency} />
                  </Table.Td>
                  <Table.Td>
                    <MoneyText amount={a.outstanding} currency={a.currency} />
                  </Table.Td>
                  <Table.Td>{formatDate(a.dueDate)}</Table.Td>
                  <Table.Td>
                    <StatusBadge status={a.status} />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Tabs.Panel>
        <Tabs.Panel value="water" pt="md">
          <Text c="dimmed">Water accounts are added in the water billing module.</Text>
        </Tabs.Panel>
        <Tabs.Panel value="payments" pt="md">
          <Table withTableBorder striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Paid at</Table.Th>
                <Table.Th>Control number</Table.Th>
                <Table.Th>Channel</Table.Th>
                <Table.Th ta="right">Amount</Table.Th>
                <Table.Th ta="right">Local</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {profile.payments.map((p) => (
                <Table.Tr key={p.id}>
                  <Table.Td>{formatDateTime(p.paidAt)}</Table.Td>
                  <Table.Td ff="monospace">{p.controlNumber}</Table.Td>
                  <Table.Td>{p.channel}</Table.Td>
                  <Table.Td>
                    <MoneyText amount={p.amount} currency={p.currency} />
                  </Table.Td>
                  <Table.Td>
                    <MoneyText amount={p.localAmount} currency={currency} />
                  </Table.Td>
                  <Table.Td>
                    <StatusBadge status={p.status} />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Tabs.Panel>
        <Tabs.Panel value="balance" pt="md">
          <Card withBorder maw={420}>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text>Total assessed</Text>
                <MoneyText amount={balances.assessedTotal} currency={currency} />
              </Group>
              <Group justify="space-between">
                <Text>Total paid</Text>
                <MoneyText amount={balances.paidTotal} currency={currency} />
              </Group>
              <Group justify="space-between">
                <Text fw={600}>Outstanding</Text>
                <MoneyText fw={600} amount={balances.outstanding} currency={currency} />
              </Group>
            </Stack>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

function SummaryCard({
  label,
  amount,
  currency,
  highlight,
}: {
  readonly label: string;
  readonly amount: string;
  readonly currency: string;
  readonly highlight?: boolean;
}): ReactElement {
  return (
    <Card withBorder>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <MoneyText
        amount={amount}
        currency={currency}
        fz="xl"
        fw={highlight === true ? WEIGHT_BOLD : WEIGHT_MEDIUM}
        ta="left"
      />
    </Card>
  );
}
