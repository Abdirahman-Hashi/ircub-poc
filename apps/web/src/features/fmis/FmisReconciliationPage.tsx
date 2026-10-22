import { Badge, Button, Drawer, Group, Stack, Table, Text, TextInput } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';

import { FmisReconciliationStatus } from '@ircub/shared';

import {
  exportFmisReconciliation,
  getFmisDrilldown,
  getFmisReconciliation,
} from '../../api/fmis.api';
import { QUERY_KEYS } from '../../api/query-keys.constants';
import { MoneyText } from '../../components/MoneyText';
import { PageHeader } from '../../components/PageHeader';
import { downloadBlob } from '../../lib/download';
import { toDateInput } from '../../lib/format';
import { notifyError } from '../../lib/notify';
import { PaymentDetailDrawer } from '../payments/PaymentDetailDrawer';
import { LOCAL_CURRENCY } from '../payments/payments.constants';

import { DEFAULT_COLOR, FMIS_UI, RECON_STATUS_COLORS } from './fmis.constants';
import { FmisTabs } from './FmisTabs';
import { JournalLinesTable } from './JournalLinesTable';

function daysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return toDateInput(date);
}

/** IRCUB posted totals vs the FMIS ledger per day and GL, with drill-down to lines and payments. */
export function FmisReconciliationPage(): ReactElement {
  const [from, setFrom] = useState(daysAgo(FMIS_UI.DEFAULT_RANGE_DAYS));
  const [to, setTo] = useState(daysAgo(0));
  const [applied, setApplied] = useState({ from, to });
  const [cell, setCell] = useState<{ date: string; glCode: string } | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const rows = useQuery({
    queryKey: QUERY_KEYS.fmisReconciliation(applied.from, applied.to),
    queryFn: () => getFmisReconciliation(applied.from, applied.to),
    placeholderData: (p) => p,
  });
  const drill = useQuery({
    queryKey: QUERY_KEYS.fmisDrilldown(cell?.date ?? '', cell?.glCode ?? ''),
    queryFn: () => getFmisDrilldown(cell?.date ?? '', cell?.glCode ?? ''),
    enabled: cell !== null,
  });
  const exportCsv = async (): Promise<void> => {
    try {
      downloadBlob(
        await exportFmisReconciliation(applied.from, applied.to),
        FMIS_UI.EXPORT_FILE_NAME,
      );
    } catch (caught: unknown) {
      notifyError(caught);
    }
  };
  const mismatches = (rows.data ?? []).filter(
    (r) => r.status !== FmisReconciliationStatus.MATCHED,
  ).length;

  return (
    <Stack>
      <PageHeader
        title="FMIS"
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
      <FmisTabs />
      <Group align="flex-end">
        <TextInput
          label="From"
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.currentTarget.value);
          }}
        />
        <TextInput
          label="To"
          type="date"
          value={to}
          onChange={(e) => {
            setTo(e.currentTarget.value);
          }}
        />
        <Button
          onClick={() => {
            setApplied({ from, to });
          }}
        >
          Compare
        </Button>
        {rows.data !== undefined && (
          <Text size="sm" c={mismatches === 0 ? 'teal' : 'orange'}>
            {rows.data.length} day × GL cells, {mismatches} needing attention
          </Text>
        )}
      </Group>
      <Text size="sm" c="dimmed">
        Totals are net credits per GL (revenue GLs positive, the cash control GL negative) from
        POSTED lines on the IRCUB side and from the FMIS ledger on the other. Click a row to see the
        lines behind it.
      </Text>
      {rows.isError && <Text c="red">{rows.error.message}</Text>}
      <Table withTableBorder striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Day</Table.Th>
            <Table.Th>GL</Table.Th>
            <Table.Th>IRCUB</Table.Th>
            <Table.Th>FMIS</Table.Th>
            <Table.Th>Difference</Table.Th>
            <Table.Th>Status</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {(rows.data ?? []).length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={6}>
                <Text c="dimmed">Nothing posted in this range.</Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            (rows.data ?? []).map((row) => (
              <Table.Tr
                key={`${row.date}-${row.glCode}`}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setCell({ date: row.date, glCode: row.glCode });
                }}
              >
                <Table.Td>{row.date}</Table.Td>
                <Table.Td>
                  <Text ff="monospace" span>
                    {row.glCode}
                  </Text>{' '}
                  <Text span c="dimmed" size="xs">
                    {row.glName ?? ''}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <MoneyText amount={row.ircubTotal} currency={LOCAL_CURRENCY} />
                </Table.Td>
                <Table.Td>
                  <MoneyText amount={row.fmisTotal} currency={LOCAL_CURRENCY} />
                </Table.Td>
                <Table.Td>
                  <MoneyText
                    amount={row.difference}
                    currency={LOCAL_CURRENCY}
                    {...(row.difference === '0.00' ? {} : { c: 'red', fw: 700 })}
                  />
                </Table.Td>
                <Table.Td>
                  <Badge color={RECON_STATUS_COLORS[row.status] ?? DEFAULT_COLOR} variant="light">
                    {row.status.replace(/_/g, ' ')}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))
          )}
        </Table.Tbody>
      </Table>
      <Drawer
        opened={cell !== null}
        onClose={() => {
          setCell(null);
        }}
        position="right"
        size="xl"
        title={cell === null ? '' : `${cell.date} · GL ${cell.glCode}`}
      >
        {drill.data === undefined ? (
          <Text c="dimmed">Loading…</Text>
        ) : (
          <JournalLinesTable lines={drill.data.lines} onOpenPayment={setPaymentId} />
        )}
      </Drawer>
      <PaymentDetailDrawer
        paymentId={paymentId}
        onClose={() => {
          setPaymentId(null);
        }}
      />
    </Stack>
  );
}
