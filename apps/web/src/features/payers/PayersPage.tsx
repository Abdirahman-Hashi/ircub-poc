import { Button, Group, Stack } from '@mantine/core';
import { IconPlus, IconUsersGroup } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { type ReactElement, useMemo, useState } from 'react';

import { PayerStatus, PayerType, PERMISSIONS } from '@ircub/shared';

import { listPayers } from '../../api/payers.api';
import { QUERY_KEYS } from '../../api/query-keys.constants';
import { ROUTES } from '../../app/routes.constants';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { useCan } from '../../lib/auth';
import { formatDate } from '../../lib/format';
import { INITIAL_PAGINATION, toPageParams } from '../../lib/pagination';

import type { PayerView } from '../../api/types';
import type { FilterField, FilterValues } from '../../components/FilterBar.types';
import type { MRT_ColumnDef } from 'mantine-react-table';

const FILTERS: readonly FilterField[] = [
  { name: 'search', label: 'Search', kind: 'text', placeholder: 'Name, TIN or phone' },
  {
    name: 'type',
    label: 'Type',
    kind: 'select',
    options: Object.values(PayerType).map((v) => ({ value: v, label: v })),
  },
  {
    name: 'status',
    label: 'Status',
    kind: 'select',
    options: Object.values(PayerStatus).map((v) => ({ value: v, label: v })),
  },
];

export function PayersPage(): ReactElement {
  const navigate = useNavigate();
  const canRegister = useCan(PERMISSIONS.PAYERS_REGISTER);
  const canReview = useCan(PERMISSIONS.PAYERS_REVIEW_DUPLICATES);
  const [pagination, setPagination] = useState(INITIAL_PAGINATION);
  const [filters, setFilters] = useState<FilterValues>({});
  const params = useMemo(
    () => ({ ...toPageParams(pagination), ...filters }),
    [pagination, filters],
  );
  const payers = useQuery({
    queryKey: QUERY_KEYS.payers(params),
    queryFn: () => listPayers(params as Parameters<typeof listPayers>[0]),
    placeholderData: (p) => p,
  });

  const columns = useMemo<MRT_ColumnDef<PayerView>[]>(
    () => [
      {
        accessorKey: 'tin',
        header: 'TIN',
        Cell: ({ cell }) => (
          <span style={{ fontFamily: 'monospace' }}>{cell.getValue<string>()}</span>
        ),
      },
      { accessorKey: 'name', header: 'Name' },
      { accessorKey: 'type', header: 'Type' },
      { accessorKey: 'phone', header: 'Phone' },
      {
        accessorKey: 'status',
        header: 'Status',
        Cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'createdAt',
        header: 'Registered',
        Cell: ({ row }) => formatDate(row.original.createdAt),
      },
    ],
    [],
  );

  return (
    <Stack>
      <PageHeader
        title="Payers"
        actions={
          <Group>
            {canReview && (
              <Button
                component={Link}
                to={ROUTES.PAYER_DUPLICATES}
                variant="light"
                leftSection={<IconUsersGroup size={16} />}
              >
                Duplicate review
              </Button>
            )}
            {canRegister && (
              <Button component={Link} to={ROUTES.PAYER_NEW} leftSection={<IconPlus size={16} />}>
                Register payer
              </Button>
            )}
          </Group>
        }
      />
      <DataTable
        columns={columns}
        data={payers.data?.items ?? []}
        total={payers.data?.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={payers.isPending}
        toolbar={
          <FilterBar
            fields={FILTERS}
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
        rowActions={(payer) => (
          <Button
            size="xs"
            variant="subtle"
            onClick={() =>
              void navigate({ to: ROUTES.PAYER_DETAIL, params: { payerId: payer.id } })
            }
          >
            Open
          </Button>
        )}
      />
    </Stack>
  );
}
