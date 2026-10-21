import { Button, Group, Stack } from '@mantine/core';
import {
  IconDroplet,
  IconFileUpload,
  IconGauge,
  IconReceipt,
  IconSettings,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { type ReactElement, useMemo, useState } from 'react';

import { PERMISSIONS, WaterAccountStatus } from '@ircub/shared';

import { QUERY_KEYS } from '../../api/query-keys.constants';
import { listWaterAccounts } from '../../api/water.api';
import { ROUTES } from '../../app/routes.constants';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { MoneyText } from '../../components/MoneyText';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { useCan } from '../../lib/auth';
import { INITIAL_PAGINATION, toPageParams } from '../../lib/pagination';

import type { WaterAccountView } from '../../api/types';
import type { FilterField, FilterValues } from '../../components/FilterBar.types';
import type { MRT_ColumnDef } from 'mantine-react-table';

const LOCAL = 'SOS';
const FILTERS: readonly FilterField[] = [
  { name: 'search', label: 'Search', kind: 'text', placeholder: 'Account, payer, TIN or meter' },
  {
    name: 'status',
    label: 'Status',
    kind: 'select',
    options: Object.values(WaterAccountStatus).map((s) => ({ value: s, label: s })),
  },
];

export function WaterAccountsPage(): ReactElement {
  const navigate = useNavigate();
  const canRead = useCan(PERMISSIONS.METERS_READ);
  const canRun = useCan(PERMISSIONS.BILLING_RUN);
  const canConfig = useCan(PERMISSIONS.CONFIG_MANAGE);
  const [pagination, setPagination] = useState(INITIAL_PAGINATION);
  const [filters, setFilters] = useState<FilterValues>({});
  const params = useMemo(
    () => ({ ...toPageParams(pagination), ...filters }),
    [pagination, filters],
  );
  const accounts = useQuery({
    queryKey: QUERY_KEYS.waterAccounts(params),
    queryFn: () => listWaterAccounts(params),
    placeholderData: (p) => p,
  });

  const columns = useMemo<MRT_ColumnDef<WaterAccountView>[]>(
    () => [
      {
        accessorKey: 'accountNumber',
        header: 'Account',
        Cell: ({ cell }) => (
          <span style={{ fontFamily: 'monospace' }}>{cell.getValue<string>()}</span>
        ),
      },
      { id: 'payer', header: 'Payer', accessorFn: (row) => row.payer.name },
      { id: 'tariff', header: 'Tariff', accessorFn: (row) => row.tariffCategory.name },
      {
        id: 'meter',
        header: 'Meter',
        accessorFn: (row) => row.meters.find((m) => m.status === 'ACTIVE')?.serial ?? '—',
      },
      {
        id: 'last',
        header: 'Last reading',
        accessorFn: (row) =>
          row.meters.find((m) => m.status === 'ACTIVE')?.lastReading?.readingValue ?? '—',
      },
      {
        id: 'outstanding',
        header: 'Outstanding',
        Cell: ({ row }) => <MoneyText amount={row.original.outstanding} currency={LOCAL} />,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        Cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [],
  );

  return (
    <Stack>
      <PageHeader
        title="Water billing"
        actions={
          <Group>
            {canRead && (
              <>
                <Button
                  component={Link}
                  to={ROUTES.WATER_READINGS}
                  variant="light"
                  leftSection={<IconGauge size={16} />}
                >
                  Readings
                </Button>
                <Button
                  component={Link}
                  to={ROUTES.WATER_READINGS_UPLOAD}
                  variant="light"
                  leftSection={<IconFileUpload size={16} />}
                >
                  Upload readings
                </Button>
              </>
            )}
            {canRun && (
              <Button
                component={Link}
                to={ROUTES.WATER_CYCLES}
                variant="light"
                leftSection={<IconReceipt size={16} />}
              >
                Billing cycles
              </Button>
            )}
            {canConfig && (
              <Button
                component={Link}
                to={ROUTES.WATER_TARIFFS}
                variant="subtle"
                leftSection={<IconSettings size={16} />}
              >
                Tariffs
              </Button>
            )}
          </Group>
        }
      />
      <DataTable
        columns={columns}
        data={accounts.data?.items ?? []}
        total={accounts.data?.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={accounts.isPending}
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
        rowActions={(account) => (
          <Button
            size="xs"
            variant="subtle"
            leftSection={<IconDroplet size={14} />}
            onClick={() =>
              void navigate({ to: ROUTES.WATER_ACCOUNT_DETAIL, params: { accountId: account.id } })
            }
          >
            Open
          </Button>
        )}
      />
    </Stack>
  );
}
