import { zodResolver } from '@hookform/resolvers/zod';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Modal,
  NavLink,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactElement, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import type { PermissionCode } from '@ircub/shared';

import { QUERY_KEYS } from '../../api/query-keys.constants';
import {
  createRole,
  deleteRole,
  listPermissionGroups,
  listRoles,
  setRolePermissions,
} from '../../api/roles.api';
import { notifyError, notifySuccess } from '../../lib/notify';

import { AdminTabs } from './AdminTabs';
import { cellState, toggleDirect } from './permission-matrix.rules';
import { type CreateRoleForm, createRoleSchema } from './role.schema';

import type { RoleDetail } from '../../api/types';

export function RolesPage(): ReactElement {
  const queryClient = useQueryClient();
  const roles = useQuery({ queryKey: QUERY_KEYS.roles, queryFn: listRoles });
  const groups = useQuery({ queryKey: QUERY_KEYS.permissions, queryFn: listPermissionGroups });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const selected = useMemo(
    () => roles.data?.find((role) => role.id === selectedId) ?? roles.data?.[0] ?? null,
    [roles.data, selectedId],
  );
  const invalidate = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.roles });

  const remove = useMutation({
    mutationFn: deleteRole,
    onSuccess: async () => {
      notifySuccess('Role deleted');
      setSelectedId(null);
      await invalidate();
    },
    onError: notifyError,
  });

  return (
    <Stack>
      <Title order={2}>Administration</Title>
      <AdminTabs />
      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        <Card withBorder p="xs">
          <Group justify="space-between" mb="xs" px="xs">
            <Text fw={500}>Roles</Text>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconPlus size={14} />}
              onClick={() => {
                setCreateOpen(true);
              }}
            >
              Custom role
            </Button>
          </Group>
          {(roles.data ?? []).map((role) => (
            <NavLink
              key={role.id}
              label={role.name}
              description={role.isSystem ? 'Built-in' : 'Custom'}
              rightSection={
                <Badge size="xs" variant="light">
                  {role.userCount}
                </Badge>
              }
              active={selected?.id === role.id}
              onClick={() => {
                setSelectedId(role.id);
              }}
            />
          ))}
        </Card>
        <Card withBorder style={{ gridColumn: 'span 2' }}>
          {selected !== null && groups.data !== undefined ? (
            <PermissionMatrix
              key={selected.id}
              role={selected}
              parentName={roles.data?.find((role) => role.id === selected.parentId)?.name ?? null}
              groups={groups.data}
              onSaved={invalidate}
              onDelete={() => {
                remove.mutate(selected.id);
              }}
            />
          ) : (
            <Text c="dimmed">Select a role.</Text>
          )}
        </Card>
      </SimpleGrid>

      <CreateRoleModal
        opened={createOpen}
        parents={(roles.data ?? []).map((role) => ({ value: role.id, label: role.name }))}
        onClose={() => {
          setCreateOpen(false);
        }}
        onCreated={async (created) => {
          setCreateOpen(false);
          setSelectedId(created.id);
          await invalidate();
        }}
      />
    </Stack>
  );
}

function PermissionMatrix(props: {
  readonly role: RoleDetail;
  readonly parentName: string | null;
  readonly groups: readonly {
    group: string;
    permissions: readonly { code: string; description: string }[];
  }[];
  readonly onSaved: () => Promise<void>;
  readonly onDelete: () => void;
}): ReactElement {
  const inherited = useMemo(
    () => new Set(props.role.inheritedPermissionCodes),
    [props.role.inheritedPermissionCodes],
  );
  const [direct, setDirect] = useState<ReadonlySet<PermissionCode>>(
    new Set(props.role.permissionCodes),
  );
  // Keyed by role id in the parent, so switching roles remounts this component with fresh state.

  const save = useMutation({
    mutationFn: () => setRolePermissions(props.role.id, [...direct]),
    onSuccess: async () => {
      notifySuccess('Permissions saved');
      await props.onSaved();
    },
    onError: notifyError,
  });
  const dirty = useMemo(() => {
    const original = new Set(props.role.permissionCodes);
    return original.size !== direct.size || [...direct].some((code) => !original.has(code));
  }, [direct, props.role.permissionCodes]);

  return (
    <Stack>
      <Group justify="space-between">
        <div>
          <Text fw={600}>{props.role.name}</Text>
          <Text size="sm" c="dimmed">
            {props.role.code}
            {props.parentName === null ? '' : ` · inherits ${props.parentName}`}
            {props.role.description === null ? '' : ` · ${props.role.description}`}
          </Text>
        </div>
        <Group>
          {!props.role.isSystem && (
            <Button
              variant="subtle"
              color="red"
              size="xs"
              leftSection={<IconTrash size={14} />}
              onClick={props.onDelete}
              disabled={props.role.userCount > 0}
            >
              Delete
            </Button>
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
      </Group>
      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        {props.groups.map((group) => (
          <Card key={group.group} withBorder p="sm">
            <Text fw={500} mb="xs">
              {group.group}
            </Text>
            <Stack gap={6}>
              {group.permissions.map((permission) => {
                const code = permission.code as PermissionCode;
                const state = cellState(code, direct, inherited);
                return (
                  <Tooltip
                    key={code}
                    label={
                      state === 'inherited'
                        ? 'Inherited from the parent role'
                        : permission.description
                    }
                    openDelay={400}
                  >
                    <Checkbox
                      label={
                        <Group gap={6}>
                          <Text size="sm" ff="monospace">
                            {code}
                          </Text>
                          {state === 'inherited' && (
                            <Badge size="xs" color="gray" variant="light">
                              inherited
                            </Badge>
                          )}
                        </Group>
                      }
                      checked={state !== 'none'}
                      disabled={state === 'inherited'}
                      onChange={() => {
                        setDirect((current) => toggleDirect(code, current, inherited));
                      }}
                    />
                  </Tooltip>
                );
              })}
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

function CreateRoleModal(props: {
  readonly opened: boolean;
  readonly parents: readonly { value: string; label: string }[];
  readonly onClose: () => void;
  readonly onCreated: (created: RoleDetail) => Promise<void>;
}): ReactElement {
  const form = useForm<CreateRoleForm>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: { code: '', name: '', description: '' },
  });
  const create = useMutation({
    mutationFn: createRole,
    onSuccess: async (created) => {
      form.reset();
      await props.onCreated(created);
    },
    onError: notifyError,
  });
  const onSubmit = form.handleSubmit((values) => {
    create.mutate({
      code: values.code,
      name: values.name,
      ...(values.description === undefined || values.description.length === 0
        ? {}
        : { description: values.description }),
      ...(values.parentId === undefined || values.parentId.length === 0
        ? {}
        : { parentId: values.parentId }),
    });
  });
  return (
    <Modal opened={props.opened} onClose={props.onClose} title="New custom role">
      <form onSubmit={(event) => void onSubmit(event)}>
        <Stack>
          <TextInput
            label="Code"
            placeholder="CASHIER"
            {...form.register('code')}
            error={form.formState.errors.code?.message}
          />
          <TextInput
            label="Name"
            {...form.register('name')}
            error={form.formState.errors.name?.message}
          />
          <TextInput label="Description" {...form.register('description')} />
          <Controller
            control={form.control}
            name="parentId"
            render={({ field }) => (
              <Select
                label="Inherits from"
                placeholder="None"
                clearable
                data={[...props.parents]}
                value={field.value ?? null}
                onChange={(value) => {
                  field.onChange(value ?? undefined);
                }}
              />
            )}
          />
          <Button type="submit" loading={create.isPending}>
            Create
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
