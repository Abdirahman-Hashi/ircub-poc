import { Badge, Button, Card, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { type ReactElement, useState } from 'react';

import { JournalBatchStatus, PERMISSIONS } from '@ircub/shared';

import { getJournalBatch, retryJournalBatch } from '../../api/fmis.api';
import { QUERY_KEYS } from '../../api/query-keys.constants';
import { MoneyText } from '../../components/MoneyText';
import { PageHeader } from '../../components/PageHeader';
import { useCan } from '../../lib/auth';
import { formatDate, formatDateTime } from '../../lib/format';
import { useLiveEvent } from '../../lib/live-events';
import { notifyError, notifySuccess } from '../../lib/notify';
import { PaymentDetailDrawer } from '../payments/PaymentDetailDrawer';
import { LOCAL_CURRENCY } from '../payments/payments.constants';

import { BATCH_STATUS_COLORS, DEFAULT_COLOR } from './fmis.constants';
import { JournalLinesTable } from './JournalLinesTable';

/** One batch: header cards, lines, and the payment drawer for the full chain. */
export function JournalBatchDetailPage(): ReactElement {
  const batchId = useParams({ strict: false }).batchId ?? '';
  const queryClient = useQueryClient();
  const canPost = useCan(PERMISSIONS.FMIS_POST);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const batch = useQuery({
    queryKey: QUERY_KEYS.journalBatch(batchId),
    queryFn: () => getJournalBatch(batchId),
  });
  useLiveEvent(() => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.journalBatch(batchId) });
  });
  const retry = useMutation({
    mutationFn: () => retryJournalBatch(batchId),
    onSuccess: async () => {
      notifySuccess('Batch re-queued for posting');
      await queryClient.invalidateQueries({ queryKey: ['fmis'] });
    },
    onError: notifyError,
  });
  const b = batch.data;
  if (b === undefined) {
    return <Text c="dimmed">Loading…</Text>;
  }
  return (
    <Stack>
      <PageHeader
        title={`${b.kind} · ${formatDate(b.batchDate)}`}
        actions={
          canPost && b.status === JournalBatchStatus.FAILED ? (
            <Button
              color="orange"
              onClick={() => {
                retry.mutate();
              }}
              loading={retry.isPending}
            >
              Retry posting
            </Button>
          ) : null
        }
      />
      <SimpleGrid cols={{ base: 2, md: 4 }}>
        <Card withBorder>
          <Text size="sm" c="dimmed">
            Status
          </Text>
          <Badge color={BATCH_STATUS_COLORS[b.status] ?? DEFAULT_COLOR} variant="filled" mt="xs">
            {b.status}
          </Badge>
        </Card>
        <Card withBorder>
          <Text size="sm" c="dimmed">
            FMIS reference
          </Text>
          <Text fw={700} ff="monospace">
            {b.fmisReference ?? '—'}
          </Text>
          <Text size="xs" c="dimmed">
            {formatDateTime(b.postedAt)}
          </Text>
        </Card>
        <Card withBorder>
          <Text size="sm" c="dimmed">
            Lines / total
          </Text>
          <Group gap="xs">
            <Text fw={700}>{b.lineCount}</Text>
            <MoneyText amount={b.totalLocal} currency={LOCAL_CURRENCY} fw={700} />
          </Group>
        </Card>
        <Card withBorder>
          <Text size="sm" c="dimmed">
            Attempts
          </Text>
          <Text fw={700}>{b.attempts}</Text>
          {b.lastError !== null && (
            <Text size="xs" c="red">
              {b.lastError}
            </Text>
          )}
        </Card>
      </SimpleGrid>
      {b.reversedByBatchId !== null && (
        <Text size="sm" c="orange">
          Fully reversed by batch {b.reversedByBatchId}.
        </Text>
      )}
      <JournalLinesTable lines={b.lines} onOpenPayment={setPaymentId} />
      <PaymentDetailDrawer
        paymentId={paymentId}
        onClose={() => {
          setPaymentId(null);
        }}
      />
    </Stack>
  );
}
