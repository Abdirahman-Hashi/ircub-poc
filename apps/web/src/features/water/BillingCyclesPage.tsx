import { Button, Group, Modal, Stack, Table, Text, TextInput } from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { type ReactElement, useState } from 'react';

import { PERMISSIONS } from '@ircub/shared';

import { QUERY_KEYS } from '../../api/query-keys.constants';
import { listBillingCycles, runBillingCycle } from '../../api/water.api';
import { ROUTES } from '../../app/routes.constants';
import { MoneyText } from '../../components/MoneyText';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { useCan } from '../../lib/auth';
import { formatDateTime } from '../../lib/format';
import { notifyError, notifySuccess } from '../../lib/notify';
import { INITIAL_PAGINATION, toPageParams } from '../../lib/pagination';

const LOCAL = 'SOS';
const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const PERIOD_LENGTH = 7;

function currentPeriod(): string {
  return new Date().toISOString().slice(0, PERIOD_LENGTH);
}

export function BillingCyclesPage(): ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canRun = useCan(PERMISSIONS.BILLING_RUN);
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState(currentPeriod());
  const params = toPageParams({ ...INITIAL_PAGINATION, pageSize: 24 });
  const cycles = useQuery({
    queryKey: QUERY_KEYS.billingCycles(params),
    queryFn: () => listBillingCycles(params),
  });
  const run = useMutation({
    mutationFn: () => runBillingCycle(period),
    onSuccess: async (cycle) => {
      notifySuccess(
        `Cycle ${cycle.period}: ${cycle.stats.billed} bills, ${cycle.stats.flagged} flagged, ${cycle.stats.skipped.length} skipped`,
      );
      setOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['billing-cycles'] });
      await navigate({ to: ROUTES.WATER_CYCLE_DETAIL, params: { cycleId: cycle.id } });
    },
    onError: notifyError,
  });

  return (
    <Stack>
      <PageHeader
        title="Billing cycles"
        actions={
          canRun ? (
            <Button
              leftSection={<IconPlayerPlay size={16} />}
              onClick={() => {
                setOpen(true);
              }}
            >
              Run cycle
            </Button>
          ) : null
        }
      />
      <Table withTableBorder striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Period</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Run at</Table.Th>
            <Table.Th>Billed</Table.Th>
            <Table.Th>Flagged</Table.Th>
            <Table.Th>Skipped</Table.Th>
            <Table.Th ta="right">Total billed</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {(cycles.data?.items ?? []).map((cycle) => (
            <Table.Tr key={cycle.id}>
              <Table.Td ff="monospace">{cycle.period}</Table.Td>
              <Table.Td>
                <StatusBadge status={cycle.status} />
              </Table.Td>
              <Table.Td>{formatDateTime(cycle.runAt)}</Table.Td>
              <Table.Td>{cycle.stats.billed}</Table.Td>
              <Table.Td>{cycle.stats.flagged}</Table.Td>
              <Table.Td>{cycle.stats.skipped.length}</Table.Td>
              <Table.Td>
                <MoneyText amount={cycle.stats.totalBilled} currency={LOCAL} />
              </Table.Td>
              <Table.Td>
                <Button
                  size="xs"
                  variant="subtle"
                  onClick={() =>
                    void navigate({ to: ROUTES.WATER_CYCLE_DETAIL, params: { cycleId: cycle.id } })
                  }
                >
                  Open
                </Button>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Modal
        opened={open}
        onClose={() => {
          setOpen(false);
        }}
        title="Run billing cycle"
      >
        <Stack>
          <TextInput
            label="Period (YYYY-MM)"
            value={period}
            onChange={(e) => {
              setPeriod(e.currentTarget.value);
            }}
            error={PERIOD_PATTERN.test(period) ? undefined : 'Use YYYY-MM'}
          />
          <Text size="sm" c="dimmed">
            Every active account with a reading in the period is billed. Accounts without a reading
            are listed on the exception report. A released period cannot be re-run.
          </Text>
          <Group justify="flex-end">
            <Button
              variant="subtle"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                run.mutate();
              }}
              loading={run.isPending}
              disabled={!PERIOD_PATTERN.test(period)}
            >
              Run
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
