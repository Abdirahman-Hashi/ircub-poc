import { Button, Card, Group, Stack, Table, Text, TextInput } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';

import { PERMISSIONS } from '@ircub/shared';

import {
  deleteTarget,
  importTargets,
  listTargets,
  targetsTemplate,
  upsertTarget,
} from '../../api/dashboard.api';
import { QUERY_KEYS } from '../../api/query-keys.constants';
import { listRevenueTypes } from '../../api/revenue-types.api';
import { CsvUploader } from '../../components/CsvUploader';
import { MoneyText } from '../../components/MoneyText';
import { PageHeader } from '../../components/PageHeader';
import { useCan } from '../../lib/auth';
import { notifyError, notifySuccess } from '../../lib/notify';
import { LOCAL_CURRENCY } from '../payments/payments.constants';

import { DASHBOARD_UI } from './dashboard.constants';
import { monthsOf, presetRange } from './dashboard.rules';

/** Monthly revenue targets per revenue type: inline edits and CSV import (D12). */
export function TargetsPage(): ReactElement {
  const queryClient = useQueryClient();
  const canManage = useCan(PERMISSIONS.TARGETS_MANAGE);
  const defaults = monthsOf(presetRange('12m', new Date()));
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [applied, setApplied] = useState({ from, to });
  const [period, setPeriod] = useState(defaults.to);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const targets = useQuery({
    queryKey: QUERY_KEYS.targets(applied),
    queryFn: () => listTargets(applied.from, applied.to),
  });
  const types = useQuery({
    queryKey: QUERY_KEYS.revenueTypes(false),
    queryFn: () => listRevenueTypes(false),
  });
  const refresh = (): Promise<void> => queryClient.invalidateQueries({ queryKey: ['targets'] });
  const save = useMutation({
    mutationFn: (input: { revenueTypeId: string; amount: string }) =>
      upsertTarget({ period, ...input }),
    onSuccess: async () => {
      notifySuccess('Target saved');
      await refresh();
    },
    onError: notifyError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteTarget(id),
    onSuccess: refresh,
    onError: notifyError,
  });
  const byKey = new Map((targets.data ?? []).map((t) => [`${t.period}|${t.revenueTypeId}`, t]));

  return (
    <Stack>
      <PageHeader title="Revenue targets" />
      <Group align="flex-end">
        <TextInput
          label="From (YYYY-MM)"
          value={from}
          onChange={(e) => {
            setFrom(e.currentTarget.value);
          }}
        />
        <TextInput
          label="To (YYYY-MM)"
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
          Show
        </Button>
      </Group>
      {canManage && (
        <Card withBorder>
          <Group align="flex-end" mb="sm">
            <TextInput
              label="Edit period (YYYY-MM)"
              value={period}
              onChange={(e) => {
                setPeriod(e.currentTarget.value);
              }}
            />
            <Text size="sm" c="dimmed">
              Enter an amount per revenue type and save; water has bills instead of targets.
            </Text>
          </Group>
          <Table withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Revenue type</Table.Th>
                <Table.Th>Current target</Table.Th>
                <Table.Th>New amount</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(types.data ?? [])
                .filter((t) => t.code !== 'WATER')
                .map((type) => {
                  const current = byKey.get(`${period}|${type.id}`);
                  return (
                    <Table.Tr key={type.id}>
                      <Table.Td>{type.name}</Table.Td>
                      <Table.Td>
                        {current === undefined ? (
                          '—'
                        ) : (
                          <MoneyText amount={current.amount} currency={LOCAL_CURRENCY} ta="left" />
                        )}
                      </Table.Td>
                      <Table.Td>
                        <TextInput
                          size="xs"
                          value={drafts[type.id] ?? ''}
                          placeholder={current?.amount ?? '0.00'}
                          onChange={(e) => {
                            const value = e.currentTarget.value;
                            setDrafts((d) => ({ ...d, [type.id]: value }));
                          }}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Button
                            size="xs"
                            disabled={(drafts[type.id] ?? '').length === 0}
                            loading={save.isPending}
                            onClick={() => {
                              save.mutate({
                                revenueTypeId: type.id,
                                amount: drafts[type.id] ?? '',
                              });
                            }}
                          >
                            Save
                          </Button>
                          {current !== undefined && (
                            <Button
                              size="xs"
                              variant="subtle"
                              color="red"
                              onClick={() => {
                                remove.mutate(current.id);
                              }}
                            >
                              Remove
                            </Button>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
            </Table.Tbody>
          </Table>
        </Card>
      )}
      <Card withBorder>
        <Text fw={600} mb="xs">
          Targets {applied.from} → {applied.to}
        </Text>
        <Table withTableBorder striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Period</Table.Th>
              <Table.Th>Revenue type</Table.Th>
              <Table.Th>Target</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(targets.data ?? []).map((t) => (
              <Table.Tr key={t.id}>
                <Table.Td>{t.period}</Table.Td>
                <Table.Td>{t.revenueType.name}</Table.Td>
                <Table.Td>
                  <MoneyText amount={t.amount} currency={LOCAL_CURRENCY} />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
      {canManage && (
        <Card withBorder>
          <Text fw={600} mb="xs">
            Import from CSV
          </Text>
          <CsvUploader
            onDryRun={(file) => importTargets(file, true)}
            onConfirm={async (file) => {
              const summary = await importTargets(file, false);
              await refresh();
              return summary;
            }}
            onTemplate={targetsTemplate}
            templateFileName={DASHBOARD_UI.TARGETS_FILE_NAME}
          />
        </Card>
      )}
    </Stack>
  );
}
