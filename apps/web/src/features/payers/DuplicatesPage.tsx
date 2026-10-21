import { Button, Group, Select, Stack, Table, Text } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { type ReactElement, useState } from 'react';

import { DuplicateFlagStatus } from '@ircub/shared';

import { listDuplicates, reviewDuplicate } from '../../api/payers.api';
import { QUERY_KEYS } from '../../api/query-keys.constants';
import { ROUTES } from '../../app/routes.constants';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { formatDate } from '../../lib/format';
import { notifyError, notifySuccess } from '../../lib/notify';
import { INITIAL_PAGINATION, toPageParams } from '../../lib/pagination';

export function DuplicatesPage(): ReactElement {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<DuplicateFlagStatus>(DuplicateFlagStatus.PENDING);
  const params = { ...toPageParams({ ...INITIAL_PAGINATION, pageSize: 50 }), status };
  const flags = useQuery({
    queryKey: QUERY_KEYS.duplicates(params),
    queryFn: () => listDuplicates(params),
  });
  const review = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: DuplicateFlagStatus }) =>
      reviewDuplicate(id, decision),
    onSuccess: async (flag) => {
      notifySuccess(`Flag ${flag.status.toLowerCase()}`);
      await queryClient.invalidateQueries({ queryKey: ['payers', 'duplicates'] });
    },
    onError: notifyError,
  });

  return (
    <Stack>
      <PageHeader
        title="Duplicate review"
        actions={
          <Select
            data={Object.values(DuplicateFlagStatus)}
            value={status}
            onChange={(v) => {
              setStatus((v as DuplicateFlagStatus | null) ?? DuplicateFlagStatus.PENDING);
            }}
          />
        }
      />
      <Text c="dimmed" size="sm">
        Exact matches on normalised phone, email or national ID at registration. Confirm when it is
        the same person or business; dismiss when it is a coincidence.
      </Text>
      <Table withTableBorder striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Flagged payer</Table.Th>
            <Table.Th>Matches</Table.Th>
            <Table.Th>On</Table.Th>
            <Table.Th>Raised</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {(flags.data?.items ?? []).map((flag) => (
            <Table.Tr key={flag.id}>
              <Table.Td>
                <Link to={ROUTES.PAYER_DETAIL} params={{ payerId: flag.payer.id }}>
                  {flag.payer.name}
                </Link>{' '}
                <Text span ff="monospace" size="xs">
                  {flag.payer.tin}
                </Text>
              </Table.Td>
              <Table.Td>
                <Link to={ROUTES.PAYER_DETAIL} params={{ payerId: flag.matchedPayer.id }}>
                  {flag.matchedPayer.name}
                </Link>{' '}
                <Text span ff="monospace" size="xs">
                  {flag.matchedPayer.tin}
                </Text>
              </Table.Td>
              <Table.Td>{flag.matchField.replace('_', ' ')}</Table.Td>
              <Table.Td>{formatDate(flag.createdAt)}</Table.Td>
              <Table.Td>
                <StatusBadge status={flag.status} />
              </Table.Td>
              <Table.Td>
                {flag.status === DuplicateFlagStatus.PENDING && (
                  <Group gap="xs">
                    <Button
                      size="xs"
                      onClick={() => {
                        review.mutate({ id: flag.id, decision: DuplicateFlagStatus.CONFIRMED });
                      }}
                    >
                      Confirm
                    </Button>
                    <Button
                      size="xs"
                      variant="light"
                      onClick={() => {
                        review.mutate({ id: flag.id, decision: DuplicateFlagStatus.DISMISSED });
                      }}
                    >
                      Dismiss
                    </Button>
                  </Group>
                )}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      {flags.data?.total === 0 && <Text c="dimmed">Nothing to review.</Text>}
    </Stack>
  );
}
