import {
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { type ReactElement, useMemo, useState } from 'react';

import { JournalBatchKind, JournalBatchStatus, PERMISSIONS } from '@ircub/shared';

import { buildJournalBatch, listJournalBatches, retryJournalBatch } from '../../api/fmis.api';
import { QUERY_KEYS } from '../../api/query-keys.constants';
import { ROUTES } from '../../app/routes.constants';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { MoneyText } from '../../components/MoneyText';
import { PageHeader } from '../../components/PageHeader';
import { useCan } from '../../lib/auth';
import { formatDate, formatDateTime, toDateInput } from '../../lib/format';
import { notifyError, notifySuccess } from '../../lib/notify';
import { INITIAL_PAGINATION, toPageParams } from '../../lib/pagination';
import { LOCAL_CURRENCY } from '../payments/payments.constants';

import { BATCH_STATUS_COLORS, DEFAULT_COLOR } from './fmis.constants';
import { FmisTabs } from './FmisTabs';

import type { JournalBatchView } from '../../api/types';
import type { FilterField, FilterValues } from '../../components/FilterBar.types';
import type { MRT_ColumnDef } from 'mantine-react-table';

/** Daily journal batches: PENDING → POSTED | FAILED, REVERSED (brief Module 6). */
export function JournalBatchesPage(): ReactElement {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const canPost = useCan(PERMISSIONS.FMIS_POST);
  const [pagination, setPagination] = useState(INITIAL_PAGINATION);
  const [filters, setFilters] = useState<FilterValues>({});
  const [building, setBuilding] = useState(false);
  const [date, setDate] = useState(toDateInput(new Date()));
  const [forceFailure, setForceFailure] = useState(false);
  const params = useMemo(
    () => ({ ...toPageParams(pagination), ...filters }),
    [pagination, filters],
  );
  const batches = useQuery({
    queryKey: QUERY_KEYS.journalBatches(params),
    queryFn: () => listJournalBatches(params),
    placeholderData: (p) => p,
  });
  const refresh = (): Promise<void> => queryClient.invalidateQueries({ queryKey: ['fmis'] });
  const build = useMutation({
    mutationFn: () => buildJournalBatch(date, forceFailure),
    onSuccess: async (batch) => {
      notifySuccess(
        batch?.id === undefined
          ? 'Nothing to post for that day'
          : `Batch built with ${batch.lineCount} lines; posting to FMIS`,
      );
      setBuilding(false);
      await refresh();
    },
    onError: notifyError,
  });
  const retry = useMutation({
    mutationFn: (id: string) => retryJournalBatch(id),
    onSuccess: async () => {
      notifySuccess('Batch re-queued for posting');
      await refresh();
    },
    onError: notifyError,
  });

  const fields = useMemo<FilterField[]>(
    () => [
      {
        name: 'status',
        label: 'Status',
        kind: 'select',
        options: Object.values(JournalBatchStatus).map((s) => ({ value: s, label: s })),
      },
      {
        name: 'kind',
        label: 'Kind',
        kind: 'select',
        options: Object.values(JournalBatchKind).map((k) => ({ value: k, label: k })),
      },
      { name: 'dateFrom', label: 'From', kind: 'date' },
      { name: 'dateTo', label: 'To', kind: 'date' },
    ],
    [],
  );
  const columns = useMemo<MRT_ColumnDef<JournalBatchView>[]>(
    () => [
      { id: 'batchDate', header: 'Day', accessorFn: (b) => formatDate(b.batchDate) },
      { accessorKey: 'kind', header: 'Kind' },
      {
        accessorKey: 'status',
        header: 'Status',
        Cell: ({ row }) => (
          <Badge color={BATCH_STATUS_COLORS[row.original.status] ?? DEFAULT_COLOR} variant="light">
            {row.original.status}
          </Badge>
        ),
      },
      { accessorKey: 'lineCount', header: 'Lines' },
      {
        id: 'total',
        header: 'Total',
        Cell: ({ row }) => <MoneyText amount={row.original.totalLocal} currency={LOCAL_CURRENCY} />,
      },
      { id: 'ref', header: 'FMIS reference', accessorFn: (b) => b.fmisReference ?? '—' },
      { id: 'postedAt', header: 'Posted at', accessorFn: (b) => formatDateTime(b.postedAt) },
      {
        id: 'attempts',
        header: 'Attempts',
        Cell: ({ row }) =>
          row.original.lastError === null ? (
            <Text>{row.original.attempts}</Text>
          ) : (
            <Tooltip label={row.original.lastError} multiline w={320}>
              <Text c="red">{row.original.attempts}</Text>
            </Tooltip>
          ),
      },
    ],
    [],
  );

  return (
    <Stack>
      <PageHeader
        title="FMIS"
        actions={
          canPost ? (
            <Button
              leftSection={<IconPlayerPlay size={16} />}
              onClick={() => {
                setBuilding(true);
              }}
            >
              Build for date
            </Button>
          ) : null
        }
      />
      <FmisTabs />
      <Text size="sm" c="dimmed">
        A batch is built automatically at 00:30 for the previous day from confirmed payments not yet
        journaled and posted to the FMIS; each line references one payment.
      </Text>
      <DataTable
        columns={columns}
        data={batches.data?.items ?? []}
        total={batches.data?.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={batches.isPending}
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
        rowActions={(b) => (
          <Group gap="xs" wrap="nowrap">
            <Button
              size="xs"
              variant="subtle"
              onClick={() =>
                void navigate({ to: ROUTES.FMIS_BATCH_DETAIL, params: { batchId: b.id } })
              }
            >
              Open
            </Button>
            {canPost && b.status === JournalBatchStatus.FAILED && (
              <Button
                size="xs"
                variant="light"
                color="orange"
                loading={retry.isPending}
                onClick={() => {
                  retry.mutate(b.id);
                }}
              >
                Retry
              </Button>
            )}
          </Group>
        )}
      />
      <Modal
        opened={building}
        onClose={() => {
          setBuilding(false);
        }}
        title="Build journal batch"
      >
        <Stack>
          <TextInput
            label="Day (UTC)"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.currentTarget.value);
            }}
          />
          <Checkbox
            label="Demo: make the FMIS reject this posting (retry path)"
            checked={forceFailure}
            onChange={(e) => {
              setForceFailure(e.currentTarget.checked);
            }}
          />
          <Button
            onClick={() => {
              build.mutate();
            }}
            loading={build.isPending}
          >
            Build and post
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
