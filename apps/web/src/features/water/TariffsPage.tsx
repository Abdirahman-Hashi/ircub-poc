import {
  ActionIcon,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';

import { QUERY_KEYS } from '../../api/query-keys.constants';
import { createTariff, listTariffs, updateTariff } from '../../api/water.api';
import { MoneyText } from '../../components/MoneyText';
import { PageHeader } from '../../components/PageHeader';
import { LOCAL_CURRENCY } from '../../lib/currency.constants';
import { notifyError, notifySuccess } from '../../lib/notify';

import { tierErrors } from './tariffs.rules';

import type { TariffTierInput } from '../../api/types/water.types';

const DEFAULT_TIERS: TariffTierInput[] = [
  { fromUnit: 0, toUnit: 10, ratePerUnit: '' },
  { fromUnit: 10, toUnit: null, ratePerUnit: '' },
];

export function TariffsPage(): ReactElement {
  const queryClient = useQueryClient();
  const tariffs = useQuery({ queryKey: QUERY_KEYS.tariffs, queryFn: () => listTariffs(true) });
  const [open, setOpen] = useState(false);
  const invalidate = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tariffs });
  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateTariff(id, { active }),
    onSuccess: invalidate,
    onError: notifyError,
  });

  return (
    <Stack>
      <PageHeader
        title="Water tariffs"
        actions={
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => {
              setOpen(true);
            }}
          >
            New category
          </Button>
        }
      />
      <Text c="dimmed" size="sm">
        Tier bands are inclusive–exclusive unit ranges that start at 0, are contiguous, and end with
        an open-ended band. A fixed monthly service charge is added to every bill.
      </Text>
      {(tariffs.data ?? []).map((category) => (
        <Card key={category.id} withBorder>
          <Group justify="space-between" mb="xs">
            <div>
              <Text fw={600}>
                {category.name}{' '}
                <Text span ff="monospace" c="dimmed">
                  {category.code}
                </Text>
              </Text>
              <Group gap="xs">
                <Text size="sm" c="dimmed">
                  Fixed charge
                </Text>
                <MoneyText amount={category.fixedCharge} currency={LOCAL_CURRENCY} size="sm" />
              </Group>
            </div>
            <Button
              size="xs"
              variant="subtle"
              onClick={() => {
                toggle.mutate({ id: category.id, active: !category.active });
              }}
            >
              {category.active ? 'Deactivate' : 'Activate'}
            </Button>
          </Group>
          <Table withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>From (units)</Table.Th>
                <Table.Th>To</Table.Th>
                <Table.Th ta="right">Rate per unit</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {category.tiers.map((tier) => (
                <Table.Tr key={tier.id}>
                  <Table.Td>{tier.fromUnit}</Table.Td>
                  <Table.Td>{tier.toUnit ?? '∞'}</Table.Td>
                  <Table.Td>
                    <MoneyText amount={tier.ratePerUnit} currency={LOCAL_CURRENCY} />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      ))}
      <TariffModal
        opened={open}
        onClose={() => {
          setOpen(false);
        }}
        onCreated={async () => {
          setOpen(false);
          await invalidate();
        }}
      />
    </Stack>
  );
}

function TariffModal(props: {
  readonly opened: boolean;
  readonly onClose: () => void;
  readonly onCreated: () => Promise<void>;
}): ReactElement {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [fixedCharge, setFixedCharge] = useState('');
  const [tiers, setTiers] = useState<TariffTierInput[]>(DEFAULT_TIERS);
  const errors = tierErrors(tiers);
  const create = useMutation({
    mutationFn: () => createTariff({ code, name, fixedCharge, tiers }),
    onSuccess: async () => {
      notifySuccess('Tariff category created');
      setCode('');
      setName('');
      setFixedCharge('');
      setTiers(DEFAULT_TIERS);
      await props.onCreated();
    },
    onError: notifyError,
  });
  const setTier = (index: number, patch: Partial<TariffTierInput>): void => {
    setTiers((current) => current.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)));
  };
  const addTier = (): void => {
    setTiers((current) => {
      const last = current[current.length - 1];
      const from = last?.toUnit ?? (last?.fromUnit ?? 0) + 1;
      return [
        ...current.slice(0, -1),
        { ...(last ?? { fromUnit: 0, ratePerUnit: '' }), toUnit: from },
        { fromUnit: from, toUnit: null, ratePerUnit: '' },
      ];
    });
  };

  return (
    <Modal opened={props.opened} onClose={props.onClose} title="New tariff category" size="lg">
      <Stack>
        <Group grow>
          <TextInput
            label="Code"
            placeholder="DOMESTIC"
            value={code}
            onChange={(e) => {
              setCode(e.currentTarget.value.toUpperCase());
            }}
          />
          <TextInput
            label="Name"
            value={name}
            onChange={(e) => {
              setName(e.currentTarget.value);
            }}
          />
          <TextInput
            label={`Fixed charge (${LOCAL_CURRENCY})`}
            value={fixedCharge}
            onChange={(e) => {
              setFixedCharge(e.currentTarget.value);
            }}
          />
        </Group>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>From</Table.Th>
              <Table.Th>To (blank = open)</Table.Th>
              <Table.Th>Rate per unit</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {tiers.map((tier, index) => (
              <Table.Tr key={index}>
                <Table.Td>
                  <NumberInput
                    value={tier.fromUnit}
                    onChange={(v) => {
                      setTier(index, { fromUnit: Number(v) });
                    }}
                    hideControls
                    w={90}
                  />
                </Table.Td>
                <Table.Td>
                  <NumberInput
                    value={tier.toUnit ?? ''}
                    onChange={(v) => {
                      setTier(index, { toUnit: v === '' ? null : Number(v) });
                    }}
                    hideControls
                    w={90}
                  />
                </Table.Td>
                <Table.Td>
                  <TextInput
                    value={tier.ratePerUnit}
                    onChange={(e) => {
                      setTier(index, { ratePerUnit: e.currentTarget.value });
                    }}
                    w={120}
                  />
                </Table.Td>
                <Table.Td>
                  {tiers.length > 1 && (
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => {
                        setTiers((c) => c.filter((_, i) => i !== index));
                      }}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Group justify="space-between">
          <Button variant="subtle" size="xs" onClick={addTier}>
            Add band
          </Button>
          {errors.length > 0 && (
            <Text size="xs" c="red">
              {errors.join(' · ')}
            </Text>
          )}
        </Group>
        <Button
          onClick={() => {
            create.mutate();
          }}
          loading={create.isPending}
          disabled={
            errors.length > 0 || code.length === 0 || name.length === 0 || fixedCharge.length === 0
          }
        >
          Create
        </Button>
      </Stack>
    </Modal>
  );
}
