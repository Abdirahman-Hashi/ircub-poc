import { Badge, Code, Drawer, Group, Stack, Table, Text, Timeline, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';

import { PaymentStatus } from '@ircub/shared';

import { getPayment } from '../../api/payments.api';
import { QUERY_KEYS } from '../../api/query-keys.constants';
import { MoneyText } from '../../components/MoneyText';
import { StatusBadge } from '../../components/StatusBadge';
import { formatDateTime } from '../../lib/format';

import { LOCAL_CURRENCY } from './payments.constants';
import { isInFlight } from './payments.rules';

import type { PaymentDetail } from '../../api/types';
import type { ReactElement } from 'react';

const JSON_INDENT = 2;
const BULLET_SIZE = 18;
const LINE_WIDTH = 2;
/** Timeline steps: initiated, checks, final. */
const STEP_CHECKS = 1;
const STEP_FINAL = 2;

function payload(value: unknown): ReactElement {
  if (value === null || value === undefined) {
    return <Text c="dimmed">—</Text>;
  }
  return <Code block>{JSON.stringify(value, null, JSON_INDENT)}</Code>;
}

/** Timeline of what happened to an online payment: initiation, checks, final state. */
function AttemptsTimeline({ payment }: { readonly payment: PaymentDetail }): ReactElement {
  const active = isInFlight(payment.status) ? STEP_CHECKS : STEP_FINAL;
  return (
    <Timeline active={active} bulletSize={BULLET_SIZE} lineWidth={LINE_WIDTH}>
      <Timeline.Item title="Initiated">
        <Text size="xs" c="dimmed">
          {formatDateTime(payment.createdAt)} · {payment.channel}
        </Text>
      </Timeline.Item>
      <Timeline.Item title={`Status checks: ${payment.statusCheckAttempts}`}>
        <Text size="xs" c="dimmed">
          {payment.lastStatusCheckAt === null
            ? 'No status check needed yet'
            : `Last check ${formatDateTime(payment.lastStatusCheckAt)}`}
        </Text>
      </Timeline.Item>
      <Timeline.Item
        title={payment.status.replace(/_/g, ' ')}
        color={payment.status === PaymentStatus.CONFIRMED ? 'teal' : 'red'}
      >
        <Text size="xs" c="dimmed">
          {payment.status === PaymentStatus.CONFIRMED
            ? formatDateTime(payment.paidAt)
            : (payment.failureReason ?? formatDateTime(payment.permanentlyFailedAt))}
        </Text>
      </Timeline.Item>
    </Timeline>
  );
}

export function PaymentDetailDrawer({
  paymentId,
  onClose,
}: {
  readonly paymentId: string | null;
  readonly onClose: () => void;
}): ReactElement {
  const detail = useQuery({
    queryKey: QUERY_KEYS.payment(paymentId ?? ''),
    queryFn: () => getPayment(paymentId ?? ''),
    enabled: paymentId !== null,
  });
  const p = detail.data;
  return (
    <Drawer
      opened={paymentId !== null}
      onClose={onClose}
      title="Payment"
      position="right"
      size="lg"
    >
      {p === undefined ? (
        <Text c="dimmed">Loading…</Text>
      ) : (
        <Stack>
          <Group justify="space-between">
            <div>
              <Text ff="monospace">{p.controlNumber}</Text>
              <Text size="sm" c="dimmed">
                {p.payer.name} · {p.payer.tin}
              </Text>
            </div>
            <StatusBadge status={p.status} />
          </Group>
          <Table withTableBorder>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>Channel</Table.Td>
                <Table.Td>
                  {p.channel} <Badge variant="light">{p.channelTxnRef ?? 'no reference'}</Badge>
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>Amount</Table.Td>
                <Table.Td>
                  <MoneyText amount={p.amount} currency={p.currency} ta="left" />
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>Applied (local)</Table.Td>
                <Table.Td>
                  <MoneyText amount={p.localAmount} currency={LOCAL_CURRENCY} ta="left" /> at rate{' '}
                  {p.fxRate}
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>Paid at</Table.Td>
                <Table.Td>{formatDateTime(p.paidAt)}</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
          {p.channelRequestPayload !== null || p.statusCheckAttempts > 0 ? (
            <>
              <Title order={5}>Timeline</Title>
              <AttemptsTimeline payment={p} />
              <Title order={5}>Request sent to channel</Title>
              {payload(p.channelRequestPayload)}
              <Title order={5}>Callback / status response</Title>
              {payload(p.callbackPayload)}
            </>
          ) : (
            <Text c="dimmed" size="sm">
              Captured manually; no channel exchange recorded.
            </Text>
          )}
        </Stack>
      )}
    </Drawer>
  );
}
