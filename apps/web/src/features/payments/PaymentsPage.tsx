import { Button, Group, Loader, Modal, Stack, Textarea } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDeviceMobile, IconPlus } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearch } from '@tanstack/react-router';
import { type ReactElement, useMemo, useState } from 'react';

import { Currency, PaymentChannel, PaymentStatus, PERMISSIONS } from '@ircub/shared';

import { listPayments } from '../../api/payments.api';
import { QUERY_KEYS } from '../../api/query-keys.constants';
import { listRevenueTypes } from '../../api/revenue-types.api';
import { createReversal } from '../../api/reversals.api';
import { ROUTES } from '../../app/routes.constants';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { MoneyText } from '../../components/MoneyText';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { useCan } from '../../lib/auth';
import { formatDateTime } from '../../lib/format';
import { useLiveEvent } from '../../lib/live-events';
import { LIVE_EVENT } from '../../lib/live-events.constants';
import { notifyError, notifySuccess } from '../../lib/notify';
import { INITIAL_PAGINATION, toPageParams } from '../../lib/pagination';

import { InitiatePaymentModal } from './InitiatePaymentModal';
import { PaymentDetailDrawer } from './PaymentDetailDrawer';
import { LOCAL_CURRENCY } from './payments.constants';
import { describeStatusChange, isInFlight } from './payments.rules';

import type { PaymentView } from '../../api/types';
import type { PaymentsSearch } from '../../app/router.types';
import type { FilterField, FilterValues } from '../../components/FilterBar.types';
import type { MRT_ColumnDef } from 'mantine-react-table';

export function PaymentsPage(): ReactElement {
  const queryClient = useQueryClient();
  const canCapture = useCan(PERMISSIONS.PAYMENTS_CAPTURE);
  const canReverse = useCan(PERMISSIONS.REVERSALS_CAPTURE);
  const [pagination, setPagination] = useState(INITIAL_PAGINATION);
  const search: PaymentsSearch = useSearch({ strict: false });
  const [filters, setFilters] = useState<FilterValues>(
    search.status === undefined ? {} : { status: search.status },
  );
  const [reversing, setReversing] = useState<PaymentView | null>(null);
  const [reason, setReason] = useState('');
  const [paying, setPaying] = useState(false);
  // Deep links from the supervisor bell: `?status=` pre-filters, `?paymentId=` opens the drawer.
  const [detailId, setDetailId] = useState<string | null>(search.paymentId ?? null);
  const [seenSearch, setSeenSearch] = useState(search);
  if (seenSearch.status !== search.status || seenSearch.paymentId !== search.paymentId) {
    setSeenSearch(search);
    if (search.paymentId !== undefined) {
      setDetailId(search.paymentId);
    }
    if (search.status !== undefined) {
      setFilters((current) => ({ ...current, status: search.status ?? '' }));
    }
  }
  const revenueTypes = useQuery({
    queryKey: QUERY_KEYS.revenueTypes(true),
    queryFn: () => listRevenueTypes(true),
  });
  const params = useMemo(
    () => ({ ...toPageParams(pagination), ...filters }),
    [pagination, filters],
  );
  const payments = useQuery({
    queryKey: QUERY_KEYS.payments(params),
    queryFn: () => listPayments(params),
    placeholderData: (p) => p,
  });
  // Live status: refresh the list and toast final states without a reload (D4).
  useLiveEvent((event) => {
    void queryClient.invalidateQueries({ queryKey: ['payments'] });
    if (event.type === LIVE_EVENT.PAYMENT_UPDATED) {
      const notice = describeStatusChange(event.data);
      if (notice !== null) {
        notifications.show({ color: notice.color, message: notice.message });
      }
    }
  });
  const reverse = useMutation({
    mutationFn: () => createReversal(reversing?.id ?? '', reason),
    onSuccess: async () => {
      notifySuccess('Reversal requested; awaiting supervisor approval');
      setReversing(null);
      setReason('');
      await queryClient.invalidateQueries({ queryKey: ['reversals'] });
    },
    onError: notifyError,
  });

  const fields = useMemo<FilterField[]>(
    () => [
      { name: 'controlNumber', label: 'Control number', kind: 'text' },
      {
        name: 'revenueTypeId',
        label: 'Revenue type',
        kind: 'select',
        options: (revenueTypes.data ?? []).map((t) => ({ value: t.id, label: t.name })),
      },
      {
        name: 'channel',
        label: 'Channel',
        kind: 'select',
        options: Object.values(PaymentChannel).map((c) => ({ value: c, label: c })),
      },
      {
        name: 'status',
        label: 'Status',
        kind: 'select',
        options: Object.values(PaymentStatus).map((s) => ({ value: s, label: s })),
      },
      {
        name: 'currency',
        label: 'Currency',
        kind: 'select',
        options: Object.values(Currency).map((c) => ({ value: c, label: c })),
      },
      { name: 'amountMin', label: 'Local amount ≥', kind: 'number' },
      { name: 'amountMax', label: 'Local amount ≤', kind: 'number' },
      { name: 'dateFrom', label: 'Paid from', kind: 'date' },
      { name: 'dateTo', label: 'Paid to', kind: 'date' },
    ],
    [revenueTypes.data],
  );

  const columns = useMemo<MRT_ColumnDef<PaymentView>[]>(
    () => [
      {
        accessorKey: 'paidAt',
        header: 'Paid at',
        Cell: ({ row }) => formatDateTime(row.original.paidAt),
      },
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
      { id: 'type', header: 'Revenue type', accessorFn: (row) => row.revenueType?.name ?? '—' },
      { accessorKey: 'channel', header: 'Channel' },
      {
        id: 'amount',
        header: 'Amount',
        Cell: ({ row }) => (
          <MoneyText amount={row.original.amount} currency={row.original.currency} />
        ),
      },
      {
        id: 'local',
        header: 'Local',
        Cell: ({ row }) => (
          <MoneyText amount={row.original.localAmount} currency={LOCAL_CURRENCY} />
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        Cell: ({ row }) => (
          <Group gap="xs" wrap="nowrap">
            <StatusBadge status={row.original.status} />
            {isInFlight(row.original.status) && <Loader size="xs" />}
          </Group>
        ),
      },
    ],
    [],
  );

  return (
    <Stack>
      <PageHeader
        title="Payments"
        actions={
          canCapture ? (
            <Group>
              <Button
                variant="light"
                leftSection={<IconDeviceMobile size={16} />}
                onClick={() => {
                  setPaying(true);
                }}
              >
                Pay online
              </Button>
              <Button
                component={Link}
                to={ROUTES.PAYMENT_CAPTURE}
                leftSection={<IconPlus size={16} />}
              >
                Capture payment
              </Button>
            </Group>
          ) : null
        }
      />
      <DataTable
        columns={columns}
        data={payments.data?.items ?? []}
        total={payments.data?.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={payments.isPending}
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
        rowActions={(p) => (
          <Group gap="xs" wrap="nowrap">
            <Button
              size="xs"
              variant="subtle"
              onClick={() => {
                setDetailId(p.id);
              }}
            >
              Details
            </Button>
            {canReverse && p.status === PaymentStatus.CONFIRMED ? (
              <Button
                size="xs"
                variant="subtle"
                color="orange"
                onClick={() => {
                  setReversing(p);
                }}
              >
                Reverse
              </Button>
            ) : null}
          </Group>
        )}
      />
      <InitiatePaymentModal
        opened={paying}
        onClose={() => {
          setPaying(false);
        }}
        portal={false}
        onInitiated={() => void queryClient.invalidateQueries({ queryKey: ['payments'] })}
      />
      <PaymentDetailDrawer
        paymentId={detailId}
        onClose={() => {
          setDetailId(null);
        }}
      />
      <Modal
        opened={reversing !== null}
        onClose={() => {
          setReversing(null);
        }}
        title="Request reversal"
      >
        <Stack>
          <Textarea
            label="Reason"
            value={reason}
            onChange={(e) => {
              setReason(e.currentTarget.value);
            }}
            autosize
            minRows={2}
          />
          <Button
            onClick={() => {
              reverse.mutate();
            }}
            loading={reverse.isPending}
            disabled={reason.trim().length === 0}
          >
            Submit for approval
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
