import { Button, Drawer, Group, Stack, Table, Text } from '@mantine/core';
import { IconDownload, IconPlus } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { type ReactElement, useMemo, useState } from 'react';

import { AssessmentStatus, PERMISSIONS } from '@ircub/shared';

import {
  cancelAssessment,
  exportAssessmentsCsv,
  getAssessment,
  listAssessments,
} from '../../api/assessments.api';
import { QUERY_KEYS } from '../../api/query-keys.constants';
import { listRevenueTypes } from '../../api/revenue-types.api';
import { ROUTES } from '../../app/routes.constants';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { MoneyText } from '../../components/MoneyText';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { useCan } from '../../lib/auth';
import { downloadBlob } from '../../lib/download';
import { formatDate, formatDateTime } from '../../lib/format';
import { notifyError, notifySuccess } from '../../lib/notify';
import { INITIAL_PAGINATION, toPageParams } from '../../lib/pagination';

import type { AssessmentDetail, AssessmentView } from '../../api/types';
import type { FilterField, FilterValues } from '../../components/FilterBar.types';
import type { MRT_ColumnDef } from 'mantine-react-table';

const EXPORT_FILE = 'assessments.csv';

export function AssessmentsPage(): ReactElement {
  const queryClient = useQueryClient();
  const canCreate = useCan(PERMISSIONS.ASSESSMENTS_CREATE);
  const [pagination, setPagination] = useState(INITIAL_PAGINATION);
  const [filters, setFilters] = useState<FilterValues>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const revenueTypes = useQuery({
    queryKey: QUERY_KEYS.revenueTypes(true),
    queryFn: () => listRevenueTypes(true),
  });
  const params = useMemo(
    () => ({ ...toPageParams(pagination), ...filters }),
    [pagination, filters],
  );
  const assessments = useQuery({
    queryKey: QUERY_KEYS.assessments(params),
    queryFn: () => listAssessments(params),
    placeholderData: (p) => p,
  });
  const detail = useQuery({
    queryKey: QUERY_KEYS.assessment(selectedId ?? ''),
    queryFn: () => getAssessment(selectedId ?? ''),
    enabled: selectedId !== null,
  });
  const cancel = useMutation({
    mutationFn: cancelAssessment,
    onSuccess: async () => {
      notifySuccess('Assessment cancelled');
      await queryClient.invalidateQueries({ queryKey: ['assessments'] });
    },
    onError: notifyError,
  });

  const fields = useMemo<FilterField[]>(
    () => [
      { name: 'tin', label: 'TIN', kind: 'text' },
      { name: 'controlNumber', label: 'Control number', kind: 'text' },
      {
        name: 'revenueTypeId',
        label: 'Revenue type',
        kind: 'select',
        options: (revenueTypes.data ?? []).map((t) => ({ value: t.id, label: t.name })),
      },
      {
        name: 'status',
        label: 'Status',
        kind: 'select',
        options: Object.values(AssessmentStatus).map((s) => ({ value: s, label: s })),
      },
      { name: 'amountMin', label: 'Amount ≥', kind: 'number' },
      { name: 'amountMax', label: 'Amount ≤', kind: 'number' },
      { name: 'dateFrom', label: 'Created from', kind: 'date' },
      { name: 'dateTo', label: 'Created to', kind: 'date' },
      { name: 'dueFrom', label: 'Due from', kind: 'date' },
      { name: 'dueTo', label: 'Due to', kind: 'date' },
    ],
    [revenueTypes.data],
  );

  const columns = useMemo<MRT_ColumnDef<AssessmentView>[]>(
    () => [
      {
        accessorKey: 'controlNumber',
        header: 'Control number',
        Cell: ({ cell }) => (
          <span style={{ fontFamily: 'monospace' }}>{cell.getValue<string>()}</span>
        ),
      },
      {
        id: 'payer',
        header: 'Payer',
        Cell: ({ row }) => (
          <Link to={ROUTES.PAYER_DETAIL} params={{ payerId: row.original.payer.id }}>
            {row.original.payer.name}
          </Link>
        ),
      },
      { id: 'type', header: 'Revenue type', accessorFn: (row) => row.revenueType.name },
      { accessorKey: 'period', header: 'Period' },
      {
        id: 'amount',
        header: 'Amount',
        Cell: ({ row }) => (
          <MoneyText amount={row.original.amount} currency={row.original.currency} />
        ),
      },
      {
        id: 'outstanding',
        header: 'Outstanding',
        Cell: ({ row }) => (
          <MoneyText amount={row.original.outstanding} currency={row.original.currency} />
        ),
      },
      {
        accessorKey: 'dueDate',
        header: 'Due',
        Cell: ({ row }) => formatDate(row.original.dueDate),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        Cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [],
  );

  const exportCsv = async (): Promise<void> => {
    try {
      downloadBlob(await exportAssessmentsCsv(filters), EXPORT_FILE);
    } catch (caught: unknown) {
      notifyError(caught);
    }
  };

  return (
    <Stack>
      <PageHeader
        title="Assessments"
        actions={
          <Group>
            <Button
              variant="light"
              leftSection={<IconDownload size={16} />}
              onClick={() => void exportCsv()}
            >
              Export CSV
            </Button>
            {canCreate && (
              <Button
                component={Link}
                to={ROUTES.ASSESSMENT_NEW}
                leftSection={<IconPlus size={16} />}
              >
                New assessment
              </Button>
            )}
          </Group>
        }
      />
      <DataTable
        columns={columns}
        data={assessments.data?.items ?? []}
        total={assessments.data?.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={assessments.isPending}
        toolbar={
          <FilterBar
            fields={fields}
            values={filters}
            onChange={(next) => {
              setFilters(next);
              setPagination(INITIAL_PAGINATION);
            }}
            onReset={() => {
              setFilters({});
            }}
          />
        }
        rowActions={(a) => (
          <Button
            size="xs"
            variant="subtle"
            onClick={() => {
              setSelectedId(a.id);
            }}
          >
            Details
          </Button>
        )}
      />
      <Drawer
        opened={selectedId !== null}
        onClose={() => {
          setSelectedId(null);
        }}
        title="Assessment"
        position="right"
        size="lg"
      >
        {detail.data !== undefined && (
          <DetailBody
            data={detail.data}
            canCreate={canCreate}
            onCancel={(id) => {
              cancel.mutate(id);
            }}
            cancelling={cancel.isPending}
          />
        )}
      </Drawer>
    </Stack>
  );
}

function DetailBody({
  data,
  canCreate,
  onCancel,
  cancelling,
}: {
  readonly data: AssessmentDetail;
  readonly canCreate: boolean;
  readonly onCancel: (id: string) => void;
  readonly cancelling: boolean;
}): ReactElement {
  return (
    <Stack>
      <Group justify="space-between">
        <div>
          <Text ff="monospace" fz="lg">
            {data.controlNumber}
          </Text>
          <Text>
            {data.revenueType.name} · {data.payer.name}
          </Text>
        </div>
        <StatusBadge status={data.status} />
      </Group>
      <Group grow>
        <Stat
          label="Amount"
          value={<MoneyText amount={data.amount} currency={data.currency} ta="left" />}
        />
        <Stat
          label="Paid"
          value={<MoneyText amount={data.paidAmount} currency={data.currency} ta="left" />}
        />
        <Stat
          label="Outstanding"
          value={
            <MoneyText amount={data.outstanding} currency={data.currency} ta="left" fw={700} />
          }
        />
      </Group>
      <Text size="sm" c="dimmed">
        Due {formatDate(data.dueDate)} · created {formatDateTime(data.createdAt)}
        {data.notes !== null ? ` · ${data.notes}` : ''}
      </Text>
      <Text fw={500}>Payments</Text>
      <Table withTableBorder striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Paid at</Table.Th>
            <Table.Th>Channel</Table.Th>
            <Table.Th>Reference</Table.Th>
            <Table.Th ta="right">Amount</Table.Th>
            <Table.Th>Status</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data.payments.map((p) => (
            <Table.Tr key={p.id}>
              <Table.Td>{formatDateTime(p.paidAt)}</Table.Td>
              <Table.Td>{p.channel}</Table.Td>
              <Table.Td ff="monospace">{p.channelTxnRef ?? '—'}</Table.Td>
              <Table.Td>
                <MoneyText amount={p.localAmount} currency={data.currency} />
              </Table.Td>
              <Table.Td>
                <StatusBadge status={p.status} />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      {canCreate && data.status === AssessmentStatus.PENDING && (
        <Button
          color="red"
          variant="light"
          onClick={() => {
            onCancel(data.id);
          }}
          loading={cancelling}
        >
          Cancel assessment
        </Button>
      )}
    </Stack>
  );
}

function Stat({
  label,
  value,
}: {
  readonly label: string;
  readonly value: ReactElement;
}): ReactElement {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      {value}
    </div>
  );
}
