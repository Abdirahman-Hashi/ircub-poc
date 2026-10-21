import { Button, Group, Select, Stack, Table, Text } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';

import { PERMISSIONS, ReversalStatus } from '@ircub/shared';

import { QUERY_KEYS } from '../../api/query-keys.constants';
import { approveReversal, listReversals, rejectReversal } from '../../api/reversals.api';
import { MoneyText } from '../../components/MoneyText';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuth, useCan } from '../../lib/auth';
import { formatDateTime } from '../../lib/format';
import { notifyError, notifySuccess } from '../../lib/notify';
import { INITIAL_PAGINATION, toPageParams } from '../../lib/pagination';

const LOCAL = 'SOS';
const QUEUE_PAGE_SIZE = 50;

export function ReversalsPage(): ReactElement {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canApprove = useCan(PERMISSIONS.REVERSALS_APPROVE);
  const [status, setStatus] = useState<ReversalStatus | null>(ReversalStatus.PENDING_APPROVAL);
  const params = {
    ...toPageParams({ ...INITIAL_PAGINATION, pageSize: QUEUE_PAGE_SIZE }),
    ...(status === null ? {} : { status }),
  };
  const reversals = useQuery({
    queryKey: QUERY_KEYS.reversals(params),
    queryFn: () => listReversals(params),
  });
  const decide = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      approve ? approveReversal(id) : rejectReversal(id),
    onSuccess: async (result) => {
      notifySuccess(`Reversal ${result.status.toLowerCase().replace('_', ' ')}`);
      await queryClient.invalidateQueries({ queryKey: ['reversals'] });
      await queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: notifyError, // SOD_VIOLATION surfaces here with the API's message
  });

  return (
    <Stack>
      <PageHeader
        title="Reversals"
        actions={
          <Select
            placeholder="All statuses"
            clearable
            data={Object.values(ReversalStatus)}
            value={status}
            onChange={(v) => {
              setStatus(v as ReversalStatus | null);
            }}
          />
        }
      />
      <Text c="dimmed" size="sm">
        Approval reverses the payment and reduces the assessment ledger. The user who captured a
        request cannot approve or reject it.
      </Text>
      <Table withTableBorder striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Requested</Table.Th>
            <Table.Th>Payment</Table.Th>
            <Table.Th>Payer</Table.Th>
            <Table.Th ta="right">Local amount</Table.Th>
            <Table.Th>Reason</Table.Th>
            <Table.Th>Captured by</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {(reversals.data?.items ?? []).map((r) => (
            <Table.Tr key={r.id}>
              <Table.Td>{formatDateTime(r.createdAt)}</Table.Td>
              <Table.Td ff="monospace">{r.payment.controlNumber}</Table.Td>
              <Table.Td>{r.payment.payer.name}</Table.Td>
              <Table.Td>
                <MoneyText amount={r.payment.localAmount} currency={LOCAL} />
              </Table.Td>
              <Table.Td>{r.reason}</Table.Td>
              <Table.Td>
                {r.capturedByEmail ?? r.capturedById}
                {r.capturedById === user?.id ? ' (you)' : ''}
              </Table.Td>
              <Table.Td>
                <StatusBadge status={r.status} />
              </Table.Td>
              <Table.Td>
                {canApprove && r.status === ReversalStatus.PENDING_APPROVAL && (
                  <Group gap="xs">
                    <Button
                      size="xs"
                      onClick={() => {
                        decide.mutate({ id: r.id, approve: true });
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="xs"
                      variant="light"
                      color="red"
                      onClick={() => {
                        decide.mutate({ id: r.id, approve: false });
                      }}
                    >
                      Reject
                    </Button>
                  </Group>
                )}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      {reversals.data?.total === 0 && <Text c="dimmed">No reversals.</Text>}
    </Stack>
  );
}
