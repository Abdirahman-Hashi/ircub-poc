import {
  Badge,
  Button,
  Card,
  Group,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { type ReactElement, useState } from 'react';

import { ReconciliationLineStatus } from '@ircub/shared';

import { QUERY_KEYS } from '../../api/query-keys.constants';
import { exportReconciliationRun, getReconciliationRun } from '../../api/reconciliation.api';
import { MoneyText } from '../../components/MoneyText';
import { PageHeader } from '../../components/PageHeader';
import { downloadBlob } from '../../lib/download';
import { formatDate } from '../../lib/format';
import { notifyError } from '../../lib/notify';

import { LINE_STATUS_COLORS, RECONCILIATION_UI } from './reconciliation.constants';

const DEFAULT_LINE_COLOR = 'gray';

export function ReconciliationRunPage(): ReactElement {
  const runId = useParams({ strict: false }).runId ?? '';
  const [status, setStatus] = useState<string>(RECONCILIATION_UI.ALL_STATUSES);
  const run = useQuery({
    queryKey: QUERY_KEYS.reconciliationRun(runId, status),
    queryFn: () => getReconciliationRun(runId, status),
    placeholderData: (p) => p,
  });
  const exportCsv = async (): Promise<void> => {
    try {
      downloadBlob(await exportReconciliationRun(runId), RECONCILIATION_UI.EXPORT_FILE_NAME(runId));
    } catch (caught: unknown) {
      notifyError(caught);
    }
  };
  const r = run.data;
  if (r === undefined) {
    return <Text c="dimmed">Loading…</Text>;
  }
  const summary = [
    { label: 'Matched', value: r.matched, status: ReconciliationLineStatus.MATCHED },
    {
      label: 'Amount mismatch',
      value: r.amountMismatch,
      status: ReconciliationLineStatus.AMOUNT_MISMATCH,
    },
    {
      label: 'Missing in IRCUB',
      value: r.missingInIrcub,
      status: ReconciliationLineStatus.MISSING_IN_IRCUB,
    },
    {
      label: 'Missing in channel',
      value: r.missingInChannel,
      status: ReconciliationLineStatus.MISSING_IN_CHANNEL,
    },
  ];
  return (
    <Stack>
      <PageHeader
        title={`${r.channel} · ${formatDate(r.runDate)}`}
        actions={
          <Button
            variant="light"
            leftSection={<IconDownload size={16} />}
            onClick={() => void exportCsv()}
          >
            Export CSV
          </Button>
        }
      />
      {r.error !== null && (
        <Text c="red" size="sm">
          {r.error}
        </Text>
      )}
      <SimpleGrid cols={{ base: 2, md: 4 }}>
        {summary.map((item) => (
          <Card key={item.label} withBorder>
            <Text size="sm" c="dimmed">
              {item.label}
            </Text>
            <Text fw={700} size="xl" c={LINE_STATUS_COLORS[item.status] ?? DEFAULT_LINE_COLOR}>
              {item.value}
            </Text>
          </Card>
        ))}
      </SimpleGrid>
      <Group justify="space-between">
        <SegmentedControl
          value={status}
          onChange={setStatus}
          data={[
            { value: RECONCILIATION_UI.ALL_STATUSES, label: 'All' },
            ...Object.values(ReconciliationLineStatus).map((s) => ({
              value: s,
              label: s.replace(/_/g, ' '),
            })),
          ]}
        />
        <Text size="sm" c="dimmed">
          Statement: {r.statementFileName ?? '—'}
        </Text>
      </Group>
      <Table withTableBorder striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Status</Table.Th>
            <Table.Th>Channel reference</Table.Th>
            <Table.Th>Control number</Table.Th>
            <Table.Th>IRCUB amount</Table.Th>
            <Table.Th>Channel amount</Table.Th>
            <Table.Th>Note</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {r.lines.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={6}>
                <Text c="dimmed">No lines.</Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            r.lines.map((line) => (
              <Table.Tr key={line.id}>
                <Table.Td>
                  <Badge
                    color={LINE_STATUS_COLORS[line.status] ?? DEFAULT_LINE_COLOR}
                    variant="light"
                  >
                    {line.status.replace(/_/g, ' ')}
                  </Badge>
                </Table.Td>
                <Table.Td ff="monospace">{line.txnRef}</Table.Td>
                <Table.Td ff="monospace">{line.controlNumber ?? '—'}</Table.Td>
                <Table.Td>
                  {line.ircubAmount === null ? (
                    '—'
                  ) : (
                    <MoneyText amount={line.ircubAmount} currency={line.currency ?? ''} />
                  )}
                </Table.Td>
                <Table.Td>
                  {line.channelAmount === null ? (
                    '—'
                  ) : (
                    <MoneyText amount={line.channelAmount} currency={line.currency ?? ''} />
                  )}
                </Table.Td>
                <Table.Td>{line.note ?? ''}</Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}
