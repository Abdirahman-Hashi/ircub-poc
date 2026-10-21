import {
  Alert,
  Anchor,
  Button,
  Card,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
} from '@mantine/core';
import { IconSend } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { type ReactElement, useState } from 'react';

import { BillStatus, BillingCycleStatus, PERMISSIONS } from '@ircub/shared';

import { QUERY_KEYS } from '../../api/query-keys.constants';
import {
  clearBillFlag,
  confirmBillFlag,
  getBillingCycle,
  listBills,
  releaseBillingCycle,
} from '../../api/water.api';
import { MoneyText } from '../../components/MoneyText';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { useCan } from '../../lib/auth';
import { ENV } from '../../lib/env.constants';
import { notifyError, notifySuccess } from '../../lib/notify';

import { BillsTable } from './WaterAccountDetailPage';

import type { BillView } from '../../api/types';

const LOCAL = 'SOS';
const PAGE = 100;
const MOCKS_OUTBOX_PATH = '/outbox';
const MOCKS_PORT_FALLBACK = '3100';

/** The mocks app is served beside the API; derive its outbox URL for the demo link. */
function outboxUrl(): string {
  try {
    const api = new URL(ENV.API_URL, window.location.origin);
    api.port = MOCKS_PORT_FALLBACK;
    api.pathname = MOCKS_OUTBOX_PATH;
    return api.toString();
  } catch {
    return MOCKS_OUTBOX_PATH;
  }
}

export function BillingCycleDetailPage(): ReactElement {
  const cycleId = useParams({ strict: false }).cycleId ?? '';
  const queryClient = useQueryClient();
  const canRelease = useCan(PERMISSIONS.BILLING_RELEASE);
  const cycle = useQuery({
    queryKey: QUERY_KEYS.billingCycle(cycleId),
    queryFn: () => getBillingCycle(cycleId),
  });
  const flaggedBills = useQuery({
    queryKey: QUERY_KEYS.bills({ cycleId, flagged: 'true', page: 1, pageSize: PAGE }),
    queryFn: () => listBills({ cycleId, flagged: 'true', page: 1, pageSize: PAGE }),
  });
  const bills = useQuery({
    queryKey: QUERY_KEYS.bills({ cycleId, page: 1, pageSize: PAGE }),
    queryFn: () => listBills({ cycleId, page: 1, pageSize: PAGE }),
  });
  const [reviewing, setReviewing] = useState<{
    bill: BillView;
    action: 'clear' | 'confirm';
  } | null>(null);
  const [note, setNote] = useState('');

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['billing-cycles'] });
    await queryClient.invalidateQueries({ queryKey: ['bills'] });
  };
  const review = useMutation({
    mutationFn: () =>
      reviewing?.action === 'clear'
        ? clearBillFlag(reviewing.bill.id, note)
        : confirmBillFlag(reviewing?.bill.id ?? '', note),
    onSuccess: async () => {
      notifySuccess(
        reviewing?.action === 'clear'
          ? 'Flag cleared; bill eligible for release'
          : 'Flag confirmed; bill stays held',
      );
      setReviewing(null);
      setNote('');
      await refresh();
    },
    onError: notifyError,
  });
  const release = useMutation({
    mutationFn: () => releaseBillingCycle(cycleId),
    onSuccess: async (released) => {
      notifySuccess(`Cycle ${released.period} released; PDFs and notifications are being sent`);
      await refresh();
    },
    onError: notifyError,
  });

  if (cycle.isPending) {
    return <Text c="dimmed">Loading…</Text>;
  }
  if (cycle.isError) {
    return <Text c="red">Could not load cycle.</Text>;
  }
  const data = cycle.data;
  const flaggedCount = flaggedBills.data?.total ?? data.stats.flagged;
  const releasable = canRelease && data.status === BillingCycleStatus.REVIEW && flaggedCount === 0;

  return (
    <Stack>
      <PageHeader
        title={`Billing cycle ${data.period}`}
        actions={
          <Group>
            <StatusBadge status={data.status} />
            {canRelease && data.status === BillingCycleStatus.REVIEW && (
              <Button
                leftSection={<IconSend size={16} />}
                onClick={() => {
                  release.mutate();
                }}
                loading={release.isPending}
                disabled={!releasable}
                title={releasable ? '' : 'Clear or confirm every flagged bill first'}
              >
                Release ({flaggedCount} flagged)
              </Button>
            )}
          </Group>
        }
      />
      <SimpleGrid cols={{ base: 2, md: 5 }}>
        <Stat label="Accounts" value={String(data.stats.accounts)} />
        <Stat label="Billed" value={String(data.stats.billed)} />
        <Stat label="Flagged" value={String(flaggedCount)} />
        <Stat label="Skipped" value={String(data.stats.skipped.length)} />
        <Card withBorder>
          <Text size="sm" c="dimmed">
            Total billed
          </Text>
          <MoneyText amount={data.stats.totalBilled} currency={LOCAL} fz="xl" fw={700} ta="left" />
        </Card>
      </SimpleGrid>
      {data.status === BillingCycleStatus.RELEASED && (
        <Alert color="teal">
          Released. Notifications sent so far: <strong>{data.stats.notificationsSent ?? 0}</strong>.
          See them in the mock gateway outbox:{' '}
          <Anchor href={outboxUrl()} target="_blank" rel="noreferrer">
            {outboxUrl()}
          </Anchor>
        </Alert>
      )}

      <Text fw={600}>Exception report</Text>
      {(flaggedBills.data?.items.length ?? 0) > 0 && (
        <Table withTableBorder striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Account</Table.Th>
              <Table.Th>Payer</Table.Th>
              <Table.Th>Units</Table.Th>
              <Table.Th>Reason</Table.Th>
              <Table.Th>Note</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(flaggedBills.data?.items ?? []).map((bill) => (
              <Table.Tr key={bill.id}>
                <Table.Td ff="monospace">{bill.account.accountNumber}</Table.Td>
                <Table.Td>{bill.payer.name}</Table.Td>
                <Table.Td>{bill.consumption}</Table.Td>
                <Table.Td>
                  <Text size="sm">{bill.flagReason}</Text>
                </Table.Td>
                <Table.Td>{bill.flagNote ?? ''}</Table.Td>
                <Table.Td>
                  {canRelease && bill.status === BillStatus.FLAGGED && (
                    <Group gap="xs">
                      <Button
                        size="xs"
                        onClick={() => {
                          setReviewing({ bill, action: 'clear' });
                        }}
                      >
                        Clear
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        color="orange"
                        onClick={() => {
                          setReviewing({ bill, action: 'confirm' });
                        }}
                      >
                        Confirm
                      </Button>
                    </Group>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
      {data.stats.skipped.length > 0 ? (
        <Table withTableBorder striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Skipped account</Table.Th>
              <Table.Th>Reason</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.stats.skipped.map((row) => (
              <Table.Tr key={row.accountNumber}>
                <Table.Td ff="monospace">{row.accountNumber}</Table.Td>
                <Table.Td>{row.reason}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      ) : (
        <Text c="dimmed" size="sm">
          No accounts skipped.
        </Text>
      )}

      <Text fw={600}>Bills</Text>
      <BillsTable bills={bills.data?.items ?? []} />

      <Modal
        opened={reviewing !== null}
        onClose={() => {
          setReviewing(null);
        }}
        title={reviewing?.action === 'clear' ? 'Clear flag' : 'Confirm flag (keep held)'}
      >
        <Stack>
          <Text size="sm">{reviewing?.bill.flagReason}</Text>
          <Textarea
            label="Review note"
            value={note}
            onChange={(e) => {
              setNote(e.currentTarget.value);
            }}
            autosize
            minRows={2}
          />
          <Button
            onClick={() => {
              review.mutate();
            }}
            loading={review.isPending}
            disabled={note.trim().length === 0}
          >
            Save
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: string }): ReactElement {
  return (
    <Card withBorder>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text fz="xl" fw={700}>
        {value}
      </Text>
    </Card>
  );
}
