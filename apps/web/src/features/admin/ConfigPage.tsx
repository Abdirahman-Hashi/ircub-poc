import { Button, Group, NumberInput, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';

import { listConfig, updateConfig } from '../../api/config.api';
import { QUERY_KEYS } from '../../api/query-keys.constants';
import { notifyError, notifySuccess } from '../../lib/notify';

import { AdminTabs } from './AdminTabs';

import type { SystemConfigEntryView } from '../../api/types';

export function ConfigPage(): ReactElement {
  const queryClient = useQueryClient();
  const config = useQuery({ queryKey: QUERY_KEYS.config, queryFn: listConfig });
  return (
    <Stack>
      <Title order={2}>Administration</Title>
      <AdminTabs />
      <Text c="dimmed" size="sm">
        Runtime-tunable parameters. Changes are audited and take effect within 30 seconds.
      </Text>
      <Table withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Key</Table.Th>
            <Table.Th>Description</Table.Th>
            <Table.Th>Default</Table.Th>
            <Table.Th>Value</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {(config.data ?? []).map((entry) => (
            <ConfigRow
              key={entry.key}
              entry={entry}
              onSaved={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config })}
            />
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}

function ConfigRow(props: {
  readonly entry: SystemConfigEntryView;
  readonly onSaved: () => Promise<void>;
}): ReactElement {
  const isNumber = typeof props.entry.defaultValue === 'number';
  const [value, setValue] = useState<string | number>(props.entry.value as string | number);
  const save = useMutation({
    mutationFn: () => updateConfig(props.entry.key, isNumber ? Number(value) : String(value)),
    onSuccess: async () => {
      notifySuccess(`${props.entry.key} saved`);
      await props.onSaved();
    },
    onError: notifyError,
  });
  const dirty = String(value) !== String(props.entry.value);
  return (
    <Table.Tr>
      <Table.Td ff="monospace">{props.entry.key}</Table.Td>
      <Table.Td>{props.entry.description}</Table.Td>
      <Table.Td c="dimmed">{String(props.entry.defaultValue)}</Table.Td>
      <Table.Td>
        <Group gap="xs" wrap="nowrap">
          {isNumber ? (
            <NumberInput value={value} onChange={setValue} w={140} />
          ) : (
            <TextInput
              value={String(value)}
              onChange={(event) => {
                setValue(event.currentTarget.value);
              }}
              w={140}
            />
          )}
          <Button
            size="xs"
            onClick={() => {
              save.mutate();
            }}
            loading={save.isPending}
            disabled={!dirty}
          >
            Save
          </Button>
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}
