import { Button, Group, Modal, Select, Stack, Table, Text, TextInput } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';

import { PERMISSIONS } from '@ircub/shared';

import { createGlMapping, deleteGlMapping, listGlMappings } from '../../api/fmis.api';
import { QUERY_KEYS } from '../../api/query-keys.constants';
import { listRevenueTypes } from '../../api/revenue-types.api';
import { PageHeader } from '../../components/PageHeader';
import { useCan } from '../../lib/auth';
import { formatDate, toDateInput } from '../../lib/format';
import { notifyError, notifySuccess } from '../../lib/notify';

import { FmisTabs } from './FmisTabs';

/** Effective-dated revenue type → GL mappings (D17). The latest row on or before a batch date wins. */
export function GlMappingsPage(): ReactElement {
  const queryClient = useQueryClient();
  const canManage = useCan(PERMISSIONS.GL_MAPPINGS_MANAGE);
  const [adding, setAdding] = useState(false);
  const [revenueTypeId, setRevenueTypeId] = useState<string | null>(null);
  const [glCode, setGlCode] = useState('');
  const [glName, setGlName] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(toDateInput(new Date()));
  const mappings = useQuery({ queryKey: QUERY_KEYS.glMappings, queryFn: listGlMappings });
  const types = useQuery({
    queryKey: QUERY_KEYS.revenueTypes(true),
    queryFn: () => listRevenueTypes(true),
  });
  const refresh = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.glMappings });
  const create = useMutation({
    mutationFn: () =>
      createGlMapping({ revenueTypeId: revenueTypeId ?? '', glCode, glName, effectiveFrom }),
    onSuccess: async () => {
      notifySuccess('Mapping added');
      setAdding(false);
      setGlCode('');
      setGlName('');
      await refresh();
    },
    onError: notifyError,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteGlMapping(id),
    onSuccess: refresh,
    onError: notifyError,
  });

  return (
    <Stack>
      <PageHeader
        title="FMIS"
        actions={
          canManage ? (
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => {
                setAdding(true);
              }}
            >
              Add mapping
            </Button>
          ) : null
        }
      />
      <FmisTabs />
      <Text size="sm" c="dimmed">
        Each revenue type posts to the GL code effective on the batch date. Add a row with a later
        effective date to change the GL without rewriting history; posted lines keep their GL.
      </Text>
      <Table withTableBorder striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Revenue type</Table.Th>
            <Table.Th>GL code</Table.Th>
            <Table.Th>GL name</Table.Th>
            <Table.Th>Effective from</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {(mappings.data ?? []).map((m) => (
            <Table.Tr key={m.id}>
              <Table.Td>
                {m.revenueType.name}{' '}
                <Text span c="dimmed" size="xs">
                  ({m.revenueType.code})
                </Text>
              </Table.Td>
              <Table.Td ff="monospace">{m.glCode}</Table.Td>
              <Table.Td>{m.glName}</Table.Td>
              <Table.Td>{formatDate(m.effectiveFrom)}</Table.Td>
              <Table.Td>
                {canManage && (
                  <Button
                    size="xs"
                    variant="subtle"
                    color="red"
                    onClick={() => {
                      remove.mutate(m.id);
                    }}
                  >
                    Remove
                  </Button>
                )}
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Modal
        opened={adding}
        onClose={() => {
          setAdding(false);
        }}
        title="Add GL mapping"
      >
        <Stack>
          <Select
            label="Revenue type"
            data={(types.data ?? []).map((t) => ({ value: t.id, label: `${t.name} (${t.code})` }))}
            value={revenueTypeId}
            onChange={setRevenueTypeId}
          />
          <Group grow>
            <TextInput
              label="GL code"
              placeholder="4 to 6 digits"
              value={glCode}
              onChange={(e) => {
                setGlCode(e.currentTarget.value);
              }}
            />
            <TextInput
              label="Effective from"
              type="date"
              value={effectiveFrom}
              onChange={(e) => {
                setEffectiveFrom(e.currentTarget.value);
              }}
            />
          </Group>
          <TextInput
            label="GL name"
            value={glName}
            onChange={(e) => {
              setGlName(e.currentTarget.value);
            }}
          />
          <Button
            onClick={() => {
              create.mutate();
            }}
            loading={create.isPending}
            disabled={revenueTypeId === null || glCode.length === 0 || glName.length === 0}
          >
            Save
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
