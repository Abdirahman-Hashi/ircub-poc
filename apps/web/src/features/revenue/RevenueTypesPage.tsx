import { zodResolver } from '@hookform/resolvers/zod';
import { Badge, Button, Group, Modal, Select, Stack, Table, TextInput } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { RateType } from '@ircub/shared';

import { QUERY_KEYS } from '../../api/query-keys.constants';
import {
  createRevenueType,
  listRevenueTypes,
  removeRevenueType,
  updateRevenueType,
} from '../../api/revenue-types.api';
import { MoneyText } from '../../components/MoneyText';
import { PageHeader } from '../../components/PageHeader';
import { LOCAL_CURRENCY } from '../../lib/currency.constants';
import { notifyError, notifySuccess } from '../../lib/notify';

import { type RevenueTypeForm, revenueTypeSchema } from './revenue-type.schema';

export function RevenueTypesPage(): ReactElement {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const types = useQuery({
    queryKey: QUERY_KEYS.revenueTypes(true),
    queryFn: () => listRevenueTypes(true),
  });
  const invalidate = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: ['revenue-types'] });
  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateRevenueType(id, { active }),
    onSuccess: invalidate,
    onError: notifyError,
  });
  const remove = useMutation({
    mutationFn: removeRevenueType,
    onSuccess: async (result) => {
      notifySuccess(
        result === null ? 'Revenue type deleted' : 'In use — deactivated instead of deleted',
      );
      await invalidate();
    },
    onError: notifyError,
  });
  const form = useForm<RevenueTypeForm>({
    resolver: zodResolver(revenueTypeSchema),
    defaultValues: { code: '', name: '', rateType: RateType.FIXED, rate: '', glCode: '' },
  });
  const create = useMutation({
    mutationFn: createRevenueType,
    onSuccess: async () => {
      setOpen(false);
      form.reset();
      await invalidate();
    },
    onError: notifyError,
  });

  return (
    <Stack>
      <PageHeader
        title="Revenue types"
        actions={
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => {
              setOpen(true);
            }}
          >
            New revenue type
          </Button>
        }
      />
      <Table withTableBorder striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Code</Table.Th>
            <Table.Th>Name</Table.Th>
            <Table.Th>Rate</Table.Th>
            <Table.Th>GL code</Table.Th>
            <Table.Th>Active</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {(types.data ?? []).map((t) => (
            <Table.Tr key={t.id}>
              <Table.Td ff="monospace">{t.code}</Table.Td>
              <Table.Td>{t.name}</Table.Td>
              <Table.Td>
                {t.rateType === RateType.PERCENT ? (
                  `${t.rate} % of base`
                ) : (
                  <MoneyText amount={t.rate} currency={LOCAL_CURRENCY} ta="left" />
                )}
              </Table.Td>
              <Table.Td ff="monospace">{t.glCode}</Table.Td>
              <Table.Td>
                <Badge color={t.active ? 'teal' : 'gray'} variant="light">
                  {t.active ? 'Active' : 'Inactive'}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <Button
                    size="xs"
                    variant="subtle"
                    onClick={() => {
                      toggle.mutate({ id: t.id, active: !t.active });
                    }}
                  >
                    {t.active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    size="xs"
                    variant="subtle"
                    color="red"
                    onClick={() => {
                      remove.mutate(t.id);
                    }}
                  >
                    Delete
                  </Button>
                </Group>
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
        title="New revenue type"
      >
        <form
          onSubmit={(event) =>
            void form.handleSubmit(({ description, ...values }) => {
              create.mutate({ ...values, ...(description ? { description } : {}) });
            })(event)
          }
        >
          <Stack>
            <TextInput
              label="Code"
              placeholder="PARKING_FEE"
              {...form.register('code')}
              error={form.formState.errors.code?.message}
            />
            <TextInput
              label="Name"
              {...form.register('name')}
              error={form.formState.errors.name?.message}
            />
            <Controller
              control={form.control}
              name="rateType"
              render={({ field }) => (
                <Select
                  label="Rate type"
                  data={Object.values(RateType)}
                  value={field.value}
                  onChange={(v) => {
                    field.onChange(v ?? RateType.FIXED);
                  }}
                />
              )}
            />
            <TextInput
              label={
                form.watch('rateType') === RateType.PERCENT
                  ? 'Rate (% of base amount)'
                  : `Amount (${LOCAL_CURRENCY})`
              }
              {...form.register('rate')}
              error={form.formState.errors.rate?.message}
            />
            <TextInput
              label="GL code"
              placeholder="4060"
              {...form.register('glCode')}
              error={form.formState.errors.glCode?.message}
            />
            <TextInput label="Description" {...form.register('description')} />
            <Button type="submit" loading={create.isPending}>
              Create
            </Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
