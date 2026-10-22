import {
  Badge,
  Button,
  Checkbox,
  FileInput,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconPlayerPlay, IconUpload } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { type ReactElement, useMemo, useState } from 'react';

import { PaymentChannel, PERMISSIONS, ReconciliationRunStatus } from '@ircub/shared';

import { QUERY_KEYS } from '../../api/query-keys.constants';
import {
  listReconciliationRuns,
  runReconciliation,
  uploadChannelStatement,
} from '../../api/reconciliation.api';
import { ROUTES } from '../../app/routes.constants';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { PageHeader } from '../../components/PageHeader';
import { useCan } from '../../lib/auth';
import { formatDate, formatDateTime, toDateInput } from '../../lib/format';
import { notifyError, notifySuccess } from '../../lib/notify';
import { INITIAL_PAGINATION, toPageParams } from '../../lib/pagination';
import { ONLINE_CHANNELS } from '../payments/payments.constants';

import { RECONCILIATION_UI, RUN_STATUS_COLORS } from './reconciliation.constants';

import type { ReconciliationRunView } from '../../api/types';
import type { FilterField, FilterValues } from '../../components/FilterBar.types';
import type { MRT_ColumnDef } from 'mantine-react-table';

const DEFAULT_RUN_COLOR = 'gray';

/** Daily channel reconciliation (brief Module 5.3): runs list, manual run, statement upload. */
export function ReconciliationPage(): ReactElement {
  const queryClient = useQueryClient();
  const canRun = useCan(PERMISSIONS.RECONCILIATION_RUN);
  const navigate = useNavigate();
  const [pagination, setPagination] = useState(INITIAL_PAGINATION);
  const [filters, setFilters] = useState<FilterValues>({});
  const [running, setRunning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [channel, setChannel] = useState<PaymentChannel>(PaymentChannel.BANK);
  const [date, setDate] = useState(toDateInput(new Date()));
  const [perturb, setPerturb] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const params = useMemo(
    () => ({ ...toPageParams(pagination), ...filters }),
    [pagination, filters],
  );
  const runs = useQuery({
    queryKey: QUERY_KEYS.reconciliationRuns(params),
    queryFn: () => listReconciliationRuns(params),
    placeholderData: (p) => p,
  });
  const refresh = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: ['reconciliation'] });
  const run = useMutation({
    mutationFn: () => runReconciliation({ channel, date, perturb }),
    onSuccess: async (result) => {
      notifySuccess(
        result.status === ReconciliationRunStatus.COMPLETED
          ? `Run complete: ${result.matched} matched, ${result.amountMismatch} mismatched, ${result.missingInIrcub} missing in IRCUB, ${result.missingInChannel} missing in channel`
          : `Run failed: ${result.error ?? 'statement unavailable'}`,
      );
      setRunning(false);
      await refresh();
    },
    onError: notifyError,
  });
  const upload = useMutation({
    mutationFn: () => {
      if (file === null) {
        throw new Error('Choose a statement file first');
      }
      return uploadChannelStatement(file, channel, date);
    },
    onSuccess: async (result) => {
      notifySuccess(`Statement imported: ${result.matched} matched`);
      setUploading(false);
      setFile(null);
      await refresh();
    },
    onError: notifyError,
  });

  const fields = useMemo<FilterField[]>(
    () => [
      {
        name: 'channel',
        label: 'Channel',
        kind: 'select',
        options: ONLINE_CHANNELS.map((c) => ({ value: c, label: c })),
      },
      {
        name: 'status',
        label: 'Status',
        kind: 'select',
        options: Object.values(ReconciliationRunStatus).map((s) => ({ value: s, label: s })),
      },
      { name: 'dateFrom', label: 'From', kind: 'date' },
      { name: 'dateTo', label: 'To', kind: 'date' },
    ],
    [],
  );
  const columns = useMemo<MRT_ColumnDef<ReconciliationRunView>[]>(
    () => [
      { id: 'runDate', header: 'Day', accessorFn: (r) => formatDate(r.runDate) },
      { accessorKey: 'channel', header: 'Channel' },
      {
        accessorKey: 'status',
        header: 'Status',
        Cell: ({ row }) => (
          <Badge
            color={RUN_STATUS_COLORS[row.original.status] ?? DEFAULT_RUN_COLOR}
            variant="light"
          >
            {row.original.status}
          </Badge>
        ),
      },
      { accessorKey: 'matched', header: 'Matched' },
      { accessorKey: 'amountMismatch', header: 'Mismatch' },
      { accessorKey: 'missingInIrcub', header: 'Missing in IRCUB' },
      { accessorKey: 'missingInChannel', header: 'Missing in channel' },
      { id: 'file', header: 'Statement', accessorFn: (r) => r.statementFileName ?? r.error ?? '—' },
      { id: 'createdAt', header: 'Run at', accessorFn: (r) => formatDateTime(r.createdAt) },
    ],
    [],
  );

  const channelDateFields = (
    <Group grow>
      <Select
        label="Channel"
        data={[...ONLINE_CHANNELS]}
        value={channel}
        onChange={(v) => {
          setChannel((v as PaymentChannel | null) ?? PaymentChannel.BANK);
        }}
      />
      <TextInput
        label="Statement day (UTC)"
        type="date"
        value={date}
        onChange={(e) => {
          setDate(e.currentTarget.value);
        }}
      />
    </Group>
  );

  return (
    <Stack>
      <PageHeader
        title="Channel reconciliation"
        actions={
          canRun ? (
            <Group>
              <Button
                variant="light"
                leftSection={<IconUpload size={16} />}
                onClick={() => {
                  setUploading(true);
                }}
              >
                Upload statement
              </Button>
              <Button
                leftSection={<IconPlayerPlay size={16} />}
                onClick={() => {
                  setRunning(true);
                }}
              >
                Run reconciliation
              </Button>
            </Group>
          ) : null
        }
      />
      <Text size="sm" c="dimmed">
        Runs automatically at 01:00 for the previous day on every channel; run manually for any day
        or upload a statement file received out of band.
      </Text>
      <DataTable
        columns={columns}
        data={runs.data?.items ?? []}
        total={runs.data?.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={runs.isPending}
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
        rowActions={(r) => (
          <Button
            size="xs"
            variant="subtle"
            onClick={() =>
              void navigate({ to: ROUTES.RECONCILIATION_RUN, params: { runId: r.id } })
            }
          >
            Open
          </Button>
        )}
      />
      <Modal
        opened={running}
        onClose={() => {
          setRunning(false);
        }}
        title="Run reconciliation"
      >
        <Stack>
          {channelDateFields}
          <Checkbox
            label="Demo: ask the mock channel for a perturbed statement (one line dropped, one amount nudged, one unknown line)"
            checked={perturb}
            onChange={(e) => {
              setPerturb(e.currentTarget.checked);
            }}
          />
          <Button
            onClick={() => {
              run.mutate();
            }}
            loading={run.isPending}
          >
            Fetch statement and reconcile
          </Button>
        </Stack>
      </Modal>
      <Modal
        opened={uploading}
        onClose={() => {
          setUploading(false);
        }}
        title="Upload channel statement"
      >
        <Stack>
          {channelDateFields}
          <FileInput
            label="Statement CSV"
            description={`Columns: ${RECONCILIATION_UI.STATEMENT_COLUMNS}`}
            accept=".csv,text/csv"
            value={file}
            onChange={setFile}
          />
          <Button
            onClick={() => {
              upload.mutate();
            }}
            loading={upload.isPending}
            disabled={file === null}
          >
            Import and reconcile
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
