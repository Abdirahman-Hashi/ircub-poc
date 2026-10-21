import { Button, Card, Group, Select, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';

import { PERMISSION_CODES } from '@ircub/shared';

import { QUERY_KEYS } from '../../api/query-keys.constants';
import { createSodRule, deleteSodRule, listSodRules } from '../../api/sod.api';
import { notifyError, notifySuccess } from '../../lib/notify';

import { AdminTabs } from './AdminTabs';

export function SodRulesPage(): ReactElement {
  const queryClient = useQueryClient();
  const rules = useQuery({ queryKey: QUERY_KEYS.sodRules, queryFn: listSodRules });
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const invalidate = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sodRules });

  const create = useMutation({
    mutationFn: () =>
      createSodRule({ permissionACode: a ?? '', permissionBCode: b ?? '', description }),
    onSuccess: async () => {
      notifySuccess('Rule added');
      setA(null);
      setB(null);
      setDescription('');
      await invalidate();
    },
    onError: notifyError,
  });
  const remove = useMutation({
    mutationFn: deleteSodRule,
    onSuccess: async () => {
      notifySuccess('Rule removed');
      await invalidate();
    },
    onError: notifyError,
  });
  const canSubmit = a !== null && b !== null && a !== b && description.length > 0;

  return (
    <Stack>
      <Title order={2}>Administration</Title>
      <AdminTabs />
      <Text c="dimmed" size="sm">
        No user may hold both permissions of a rule through any combination of roles. Assignments
        that would break a rule are rejected.
      </Text>
      <Card withBorder>
        <Group align="flex-end">
          <Select
            label="Permission A"
            searchable
            data={[...PERMISSION_CODES]}
            value={a}
            onChange={setA}
          />
          <Select
            label="Permission B"
            searchable
            data={[...PERMISSION_CODES]}
            value={b}
            onChange={setB}
          />
          <TextInput
            label="Description"
            value={description}
            onChange={(event) => {
              setDescription(event.currentTarget.value);
            }}
            style={{ flex: 1 }}
          />
          <Button
            onClick={() => {
              create.mutate();
            }}
            loading={create.isPending}
            disabled={!canSubmit}
          >
            Add rule
          </Button>
        </Group>
      </Card>
      <Table withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Permission A</Table.Th>
            <Table.Th>Permission B</Table.Th>
            <Table.Th>Description</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {(rules.data ?? []).map((rule) => (
            <Table.Tr key={rule.id}>
              <Table.Td ff="monospace">{rule.permissionACode}</Table.Td>
              <Table.Td ff="monospace">{rule.permissionBCode}</Table.Td>
              <Table.Td>{rule.description}</Table.Td>
              <Table.Td>
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  leftSection={<IconTrash size={14} />}
                  onClick={() => {
                    remove.mutate(rule.id);
                  }}
                >
                  Remove
                </Button>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}
