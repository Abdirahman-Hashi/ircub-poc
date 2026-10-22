import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
} from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { type ReactElement, useState } from 'react';

import { PERMISSIONS } from '@ircub/shared';

import { QUERY_KEYS } from '../../api/query-keys.constants';
import {
  getBillPdf,
  getStatement,
  getStatementPdf,
  getWaterAccount,
  listBills,
  listReadings,
  replaceMeter,
} from '../../api/water.api';
import { MoneyText } from '../../components/MoneyText';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { useCan } from '../../lib/auth';
import { downloadBlob } from '../../lib/download';
import { formatDate } from '../../lib/format';
import { notifyError, notifySuccess } from '../../lib/notify';

import { ConsumptionChart } from './ConsumptionChart';

import type { BillView, MeterView, StatementView } from '../../api/types';

const LOCAL = 'SOS';
const HISTORY_PAGE = 24;

export function WaterAccountDetailPage(): ReactElement {
  const accountId = useParams({ strict: false }).accountId ?? '';
  const queryClient = useQueryClient();
  const canRegister = useCan(PERMISSIONS.PAYERS_REGISTER);
  const account = useQuery({
    queryKey: QUERY_KEYS.waterAccount(accountId),
    queryFn: () => getWaterAccount(accountId),
  });
  const readings = useQuery({
    queryKey: QUERY_KEYS.readings({ accountId, page: 1, pageSize: HISTORY_PAGE }),
    queryFn: () => listReadings({ accountId, page: 1, pageSize: HISTORY_PAGE }),
  });
  const bills = useQuery({
    queryKey: QUERY_KEYS.bills({ accountId, page: 1, pageSize: HISTORY_PAGE }),
    queryFn: () => listBills({ accountId, page: 1, pageSize: HISTORY_PAGE }),
  });
  const statement = useQuery({
    queryKey: QUERY_KEYS.statement(accountId, {}),
    queryFn: () => getStatement(accountId, {}),
  });
  const [replacing, setReplacing] = useState<MeterView | null>(null);

  if (account.isPending) {
    return <Text c="dimmed">Loading…</Text>;
  }
  if (account.isError) {
    return <Text c="red">Could not load account.</Text>;
  }
  const data = account.data;
  const activeMeter = data.meters.find((m) => m.status === 'ACTIVE');

  return (
    <Stack>
      <PageHeader
        title={`Account ${data.accountNumber}`}
        actions={<StatusBadge status={data.status} />}
      />
      <Group gap="xs">
        <Text>{data.payer.name}</Text>
        <Text c="dimmed">· {data.payer.tin}</Text>
        <Text c="dimmed">· {data.serviceAddress}</Text>
        <Badge variant="light">{data.tariffCategory.name}</Badge>
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Card withBorder>
          <Text size="sm" c="dimmed">
            Outstanding
          </Text>
          <MoneyText amount={data.outstanding} currency={LOCAL} fz="xl" fw={700} ta="left" />
        </Card>
        <Card withBorder>
          <Text size="sm" c="dimmed">
            Active meter
          </Text>
          <Text ff="monospace" fz="lg">
            {activeMeter?.serial ?? '—'}
          </Text>
        </Card>
        <Card withBorder>
          <Text size="sm" c="dimmed">
            Last reading
          </Text>
          <Text fz="lg">
            {activeMeter?.lastReading?.readingValue ?? '—'}{' '}
            <Text span size="sm" c="dimmed">
              {formatDate(activeMeter?.lastReading?.readingDate)}
            </Text>
          </Text>
        </Card>
      </SimpleGrid>
      <Tabs defaultValue="readings">
        <Tabs.List>
          <Tabs.Tab value="readings">Readings</Tabs.Tab>
          <Tabs.Tab value="meters">Meters ({data.meters.length})</Tabs.Tab>
          <Tabs.Tab value="bills">Bills ({bills.data?.total ?? 0})</Tabs.Tab>
          <Tabs.Tab value="statement">Statement</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="readings" pt="md">
          <ConsumptionChart readings={readings.data?.items ?? []} />
        </Tabs.Panel>
        <Tabs.Panel value="meters" pt="md">
          <Table withTableBorder striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Serial</Table.Th>
                <Table.Th>Installed</Table.Th>
                <Table.Th>Dial digits</Table.Th>
                <Table.Th>Initial</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.meters.map((meter) => (
                <Table.Tr key={meter.id}>
                  <Table.Td ff="monospace">{meter.serial}</Table.Td>
                  <Table.Td>{formatDate(meter.installedAt)}</Table.Td>
                  <Table.Td>{meter.maxDigits}</Table.Td>
                  <Table.Td>{meter.initialReading}</Table.Td>
                  <Table.Td>
                    <StatusBadge status={meter.status} />
                  </Table.Td>
                  <Table.Td>
                    {canRegister && meter.status === 'ACTIVE' && (
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => {
                          setReplacing(meter);
                        }}
                      >
                        Replace
                      </Button>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Tabs.Panel>
        <Tabs.Panel value="bills" pt="md">
          <BillsTable bills={bills.data?.items ?? []} />
        </Tabs.Panel>
        <Tabs.Panel value="statement" pt="md">
          {statement.data !== undefined && (
            <StatementTable
              statement={statement.data}
              onPdf={() =>
                void getStatementPdf(accountId, {})
                  .then((blob) => {
                    downloadBlob(blob, `statement-${data.accountNumber}.pdf`);
                  })
                  .catch(notifyError)
              }
            />
          )}
        </Tabs.Panel>
      </Tabs>
      <ReplaceMeterModal
        meter={replacing}
        onClose={() => {
          setReplacing(null);
        }}
        onReplaced={async () => {
          setReplacing(null);
          await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.waterAccount(accountId) });
        }}
      />
    </Stack>
  );
}

export function BillsTable({
  bills,
  onPdf,
}: {
  readonly bills: readonly BillView[];
  readonly onPdf?: (bill: BillView) => Promise<Blob>;
}): ReactElement {
  const fetchPdf = onPdf ?? ((bill: BillView) => getBillPdf(bill.id));
  return (
    <Table withTableBorder striped>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Bill number</Table.Th>
          <Table.Th>Period</Table.Th>
          <Table.Th>Units</Table.Th>
          <Table.Th ta="right">Total due</Table.Th>
          <Table.Th ta="right">Outstanding</Table.Th>
          <Table.Th>Due</Table.Th>
          <Table.Th>Status</Table.Th>
          <Table.Th />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {bills.map((bill) => (
          <Table.Tr key={bill.id}>
            <Table.Td ff="monospace">{bill.billNumber}</Table.Td>
            <Table.Td>{bill.period}</Table.Td>
            <Table.Td>{bill.consumption}</Table.Td>
            <Table.Td>
              <MoneyText amount={bill.totalDue} currency={bill.currency} />
            </Table.Td>
            <Table.Td>
              <MoneyText amount={bill.outstanding} currency={bill.currency} />
            </Table.Td>
            <Table.Td>{formatDate(bill.dueDate)}</Table.Td>
            <Table.Td>
              <StatusBadge status={bill.status} />
            </Table.Td>
            <Table.Td>
              {bill.status !== 'DRAFT' && bill.status !== 'FLAGGED' && (
                <Button
                  size="xs"
                  variant="subtle"
                  leftSection={<IconDownload size={14} />}
                  onClick={() =>
                    void fetchPdf(bill)
                      .then((blob) => {
                        downloadBlob(blob, `${bill.billNumber}.pdf`);
                      })
                      .catch(notifyError)
                  }
                >
                  PDF
                </Button>
              )}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

export function StatementTable({
  statement,
  onPdf,
}: {
  readonly statement: StatementView;
  readonly onPdf?: () => void;
}): ReactElement {
  return (
    <Stack>
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          {formatDate(statement.from)} – {formatDate(statement.to)} · opening{' '}
          <strong>{statement.openingBalance}</strong> · closing{' '}
          <strong>{statement.closingBalance}</strong> {statement.currency}
        </Text>
        {onPdf !== undefined && (
          <Button
            size="xs"
            variant="light"
            leftSection={<IconDownload size={14} />}
            onClick={onPdf}
          >
            Statement PDF
          </Button>
        )}
      </Group>
      <Table withTableBorder striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Date</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Reference</Table.Th>
            <Table.Th>Description</Table.Th>
            <Table.Th ta="right">Debit</Table.Th>
            <Table.Th ta="right">Credit</Table.Th>
            <Table.Th ta="right">Balance</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {statement.lines.map((line, index) => (
            <Table.Tr key={`${line.kind}-${line.reference}-${index}`}>
              <Table.Td>{formatDate(line.date)}</Table.Td>
              <Table.Td>{line.kind}</Table.Td>
              <Table.Td ff="monospace">{line.reference}</Table.Td>
              <Table.Td>{line.description}</Table.Td>
              <Table.Td>
                <MoneyText amount={line.debit} currency={statement.currency} />
              </Table.Td>
              <Table.Td>
                <MoneyText amount={line.credit} currency={statement.currency} />
              </Table.Td>
              <Table.Td>
                <MoneyText amount={line.balance} currency={statement.currency} fw={600} />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}

function ReplaceMeterModal(props: {
  readonly meter: MeterView | null;
  readonly onClose: () => void;
  readonly onReplaced: () => Promise<void>;
}): ReactElement {
  const [serial, setSerial] = useState('');
  const [initial, setInitial] = useState<number | string>(0);
  const [finalReading, setFinalReading] = useState<number | string>('');
  const replace = useMutation({
    mutationFn: () =>
      replaceMeter(props.meter?.id ?? '', {
        newSerial: serial,
        initialReading: Number(initial),
        ...(finalReading === '' ? {} : { finalReading: Number(finalReading) }),
      }),
    onSuccess: async () => {
      notifySuccess('Meter replaced');
      setSerial('');
      setInitial(0);
      setFinalReading('');
      await props.onReplaced();
    },
    onError: notifyError,
  });
  return (
    <Modal
      opened={props.meter !== null}
      onClose={props.onClose}
      title={`Replace meter ${props.meter?.serial ?? ''}`}
    >
      <Stack>
        <Text size="sm" c="dimmed">
          The old meter is marked REPLACED. The first reading on the new meter counts from its
          initial reading. A closing reading on the old meter bills the water used since its last
          read.
        </Text>
        <NumberInput
          label="Closing reading on the old meter (optional)"
          description={`Last recorded: ${props.meter?.lastReading?.readingValue ?? props.meter?.initialReading ?? 0}`}
          value={finalReading}
          onChange={setFinalReading}
          min={0}
        />
        <TextInput
          label="New meter serial"
          value={serial}
          onChange={(e) => {
            setSerial(e.currentTarget.value);
          }}
        />
        <NumberInput
          label="Initial reading on the new meter"
          value={initial}
          onChange={setInitial}
          min={0}
        />
        <Button
          onClick={() => {
            replace.mutate();
          }}
          loading={replace.isPending}
          disabled={serial.length === 0}
        >
          Replace
        </Button>
      </Stack>
    </Modal>
  );
}
