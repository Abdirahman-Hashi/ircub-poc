import { Badge, Button, Group, Stack, Text } from '@mantine/core';
import { IconFileUpload, IconPlus } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { type ReactElement, useMemo, useState } from 'react';

import { PERMISSIONS, ReadingSource } from '@ircub/shared';

import { QUERY_KEYS } from '../../api/query-keys.constants';
import { listReadings } from '../../api/water.api';
import { ROUTES } from '../../app/routes.constants';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { PageHeader } from '../../components/PageHeader';
import { useCan } from '../../lib/auth';
import { formatDate } from '../../lib/format';
import { INITIAL_PAGINATION, toPageParams } from '../../lib/pagination';

import type { MeterReadingView } from '../../api/types';
import type { FilterField, FilterValues } from '../../components/FilterBar.types';
import type { MRT_ColumnDef } from 'mantine-react-table';

const FILTERS: readonly FilterField[] = [
  {
    name: 'abnormal',
    label: 'Abnormal',
    kind: 'select',
    options: [
      { value: 'true', label: 'Only abnormal' },
      { value: 'false', label: 'Only normal' },
    ],
  },
  {
    name: 'source',
    label: 'Source',
    kind: 'select',
    options: Object.values(ReadingSource).map((s) => ({ value: s, label: s })),
  },
  { name: 'dateFrom', label: 'From', kind: 'date' },
  { name: 'dateTo', label: 'To', kind: 'date' },
];

export function ReadingsPage(): ReactElement {
  const canRead = useCan(PERMISSIONS.METERS_READ);
  const [pagination, setPagination] = useState(INITIAL_PAGINATION);
  const [filters, setFilters] = useState<FilterValues>({});
  const params = useMemo(
    () => ({ ...toPageParams(pagination), ...filters }),
    [pagination, filters],
  );
  const readings = useQuery({
    queryKey: QUERY_KEYS.readings(params),
    queryFn: () => listReadings(params),
    placeholderData: (p) => p,
  });

  const columns = useMemo<MRT_ColumnDef<MeterReadingView>[]>(
    () => [
      {
        accessorKey: 'readingDate',
        header: 'Date',
        Cell: ({ row }) => formatDate(row.original.readingDate),
      },
      {
        accessorKey: 'accountNumber',
        header: 'Account',
        Cell: ({ cell }) => (
          <span style={{ fontFamily: 'monospace' }}>{cell.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: 'meterSerial',
        header: 'Meter',
        Cell: ({ cell }) => (
          <span style={{ fontFamily: 'monospace' }}>{cell.getValue<string>()}</span>
        ),
      },
      { accessorKey: 'readingValue', header: 'Reading' },
      { accessorKey: 'consumption', header: 'Units' },
      { accessorKey: 'type', header: 'Type' },
      { accessorKey: 'source', header: 'Source' },
      {
        id: 'abnormal',
        header: 'Abnormal',
        Cell: ({ row }) =>
          row.original.abnormal ? (
            <Badge color="red" variant="light" title={row.original.abnormalReason ?? ''}>
              Abnormal
            </Badge>
          ) : null,
      },
    ],
    [],
  );

  return (
    <Stack>
      <PageHeader
        title="Meter readings"
        actions={
          canRead ? (
            <Group>
              <Button
                component={Link}
                to={ROUTES.WATER_READINGS_UPLOAD}
                variant="light"
                leftSection={<IconFileUpload size={16} />}
              >
                Upload CSV
              </Button>
              <Button
                component={Link}
                to={ROUTES.WATER_READINGS_NEW}
                leftSection={<IconPlus size={16} />}
              >
                Capture reading
              </Button>
            </Group>
          ) : null
        }
      />
      <Text c="dimmed" size="sm">
        Abnormal = consumption above the configured percentage of the trailing monthly average.
        Hover the badge for the numbers.
      </Text>
      <DataTable
        columns={columns}
        data={readings.data?.items ?? []}
        total={readings.data?.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={readings.isPending}
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
      />
    </Stack>
  );
}
