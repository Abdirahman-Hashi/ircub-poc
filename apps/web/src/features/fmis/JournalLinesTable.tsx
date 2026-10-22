import { Badge, Button, Table, Text } from '@mantine/core';

import { MoneyText } from '../../components/MoneyText';

import type { JournalLineView } from '../../api/types';
import type { ReactElement } from 'react';

/** Lines of a batch or a reconciliation drill-down; the payment opens the full chain. */
export function JournalLinesTable({
  lines,
  onOpenPayment,
}: {
  readonly lines: readonly JournalLineView[];
  readonly onOpenPayment: (paymentId: string) => void;
}): ReactElement {
  if (lines.length === 0) {
    return <Text c="dimmed">No lines.</Text>;
  }
  return (
    <Table withTableBorder striped>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Control number</Table.Th>
          <Table.Th>Payer</Table.Th>
          <Table.Th>Revenue type</Table.Th>
          <Table.Th>Debit GL</Table.Th>
          <Table.Th>Credit GL</Table.Th>
          <Table.Th>Amount</Table.Th>
          <Table.Th />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {lines.map((line) => (
          <Table.Tr key={line.id}>
            <Table.Td ff="monospace">
              {line.reference}{' '}
              {line.reversed && (
                <Badge color="orange" variant="light" size="xs">
                  reversed
                </Badge>
              )}
              {line.reversalId !== null && (
                <Badge color="orange" variant="light" size="xs">
                  reversal
                </Badge>
              )}
            </Table.Td>
            <Table.Td>{line.payment?.payer.name ?? '—'}</Table.Td>
            <Table.Td>{line.revenueType.name}</Table.Td>
            <Table.Td ff="monospace">{line.debitGl}</Table.Td>
            <Table.Td ff="monospace">{line.creditGl}</Table.Td>
            <Table.Td>
              <MoneyText amount={line.amount} currency={line.currency} />
            </Table.Td>
            <Table.Td>
              {line.payment !== null && (
                <Button
                  size="xs"
                  variant="subtle"
                  onClick={() => {
                    onOpenPayment(line.payment?.id ?? '');
                  }}
                >
                  Payment
                </Button>
              )}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
