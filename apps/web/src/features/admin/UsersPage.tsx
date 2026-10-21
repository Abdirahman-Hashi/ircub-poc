import { zodResolver } from '@hookform/resolvers/zod';
import {
  Badge,
  Button,
  Group,
  Menu,
  Modal,
  MultiSelect,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconDots, IconPlus } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactElement, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { UserStatus } from '@ircub/shared';

import { QUERY_KEYS } from '../../api/query-keys.constants';
import { listRoles } from '../../api/roles.api';
import {
  createUser,
  deactivateUser,
  reactivateUser,
  resetUserPassword,
  setUserRoles,
  listUsers,
} from '../../api/users.api';
import { DataTable } from '../../components/DataTable';
import { notifyError, notifySuccess } from '../../lib/notify';

import { AdminTabs } from './AdminTabs';
import { type CreateUserForm, createUserSchema } from './user.schema';

import type { UserSummary } from '../../api/types';
import type { MRT_ColumnDef } from 'mantine-react-table';

const DEFAULT_PAGE_SIZE = 25;
const STATUS_COLORS: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: 'teal',
  [UserStatus.DEACTIVATED]: 'gray',
};

export function UsersPage(): ReactElement {
  const queryClient = useQueryClient();
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [rolesFor, setRolesFor] = useState<UserSummary | null>(null);
  const [secret, setSecret] = useState<{ title: string; password: string } | null>(null);

  const params = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      ...(search.length > 0 ? { search } : {}),
      ...(status === null ? {} : { status }),
    }),
    [pagination, search, status],
  );
  const users = useQuery({
    queryKey: QUERY_KEYS.users(params),
    queryFn: () => listUsers(params),
    placeholderData: (previous) => previous,
  });
  const roles = useQuery({ queryKey: QUERY_KEYS.roles, queryFn: listRoles });
  const invalidate = (): Promise<void> => queryClient.invalidateQueries({ queryKey: ['users'] });

  const toggleStatus = useMutation({
    mutationFn: (user: UserSummary) =>
      user.status === UserStatus.ACTIVE ? deactivateUser(user.id) : reactivateUser(user.id),
    onSuccess: async (updated) => {
      notifySuccess(`${updated.email} is now ${updated.status.toLowerCase()}`);
      await invalidate();
    },
    onError: notifyError,
  });
  const reset = useMutation({
    mutationFn: (user: UserSummary) =>
      resetUserPassword(user.id).then((result) => ({ user, result })),
    onSuccess: ({ user, result }) => {
      setSecret({
        title: `Temporary password for ${user.email}`,
        password: result.temporaryPassword,
      });
    },
    onError: notifyError,
  });

  const columns = useMemo<MRT_ColumnDef<UserSummary>[]>(
    () => [
      { accessorKey: 'fullName', header: 'Name' },
      { accessorKey: 'email', header: 'Email' },
      {
        accessorKey: 'status',
        header: 'Status',
        Cell: ({ row }) => (
          <Badge color={STATUS_COLORS[row.original.status]}>{row.original.status}</Badge>
        ),
      },
      {
        accessorKey: 'mfaEnabled',
        header: '2FA',
        Cell: ({ row }) => (row.original.mfaEnabled ? 'On' : 'Off'),
      },
      {
        id: 'roles',
        header: 'Roles',
        Cell: ({ row }) => (
          <Group gap={4}>
            {row.original.roles.map((role) => (
              <Badge key={role.id} variant="light">
                {role.name}
              </Badge>
            ))}
          </Group>
        ),
      },
    ],
    [],
  );

  return (
    <Stack>
      <Title order={2}>Administration</Title>
      <AdminTabs />
      <DataTable
        columns={columns}
        data={users.data?.items ?? []}
        total={users.data?.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={users.isPending}
        toolbar={
          <Group>
            <TextInput
              placeholder="Search name or email"
              value={search}
              onChange={(event) => {
                setSearch(event.currentTarget.value);
                setPagination((p) => ({ ...p, pageIndex: 0 }));
              }}
            />
            <Select
              placeholder="Any status"
              clearable
              data={Object.values(UserStatus)}
              value={status}
              onChange={(value) => {
                setStatus(value as UserStatus | null);
              }}
            />
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => {
                setCreateOpen(true);
              }}
            >
              New user
            </Button>
          </Group>
        }
        rowActions={(user) => (
          <Menu shadow="md">
            <Menu.Target>
              <Button variant="subtle" size="xs" px={6}>
                <IconDots size={16} />
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                onClick={() => {
                  setRolesFor(user);
                }}
              >
                Edit roles
              </Menu.Item>
              <Menu.Item
                onClick={() => {
                  reset.mutate(user);
                }}
              >
                Reset password
              </Menu.Item>
              <Menu.Item
                color={user.status === UserStatus.ACTIVE ? 'red' : 'teal'}
                onClick={() => {
                  toggleStatus.mutate(user);
                }}
              >
                {user.status === UserStatus.ACTIVE ? 'Deactivate' : 'Reactivate'}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      />

      <CreateUserModal
        opened={createOpen}
        roleOptions={(roles.data ?? []).map((role) => ({ value: role.id, label: role.name }))}
        onClose={() => {
          setCreateOpen(false);
        }}
        onCreated={async (created) => {
          setCreateOpen(false);
          setSecret({
            title: `Temporary password for ${created.email}`,
            password: created.temporaryPassword,
          });
          await invalidate();
        }}
      />

      <Modal
        opened={rolesFor !== null}
        onClose={() => {
          setRolesFor(null);
        }}
        title={rolesFor === null ? '' : `Roles for ${rolesFor.email}`}
      >
        {rolesFor !== null && (
          <EditRolesForm
            user={rolesFor}
            roleOptions={(roles.data ?? []).map((role) => ({ value: role.id, label: role.name }))}
            onSaved={async () => {
              setRolesFor(null);
              await invalidate();
            }}
          />
        )}
      </Modal>

      <Modal
        opened={secret !== null}
        onClose={() => {
          setSecret(null);
        }}
        title={secret?.title ?? ''}
      >
        <Stack>
          <Text size="sm">
            Share this once with the user; it is not stored and cannot be shown again.
          </Text>
          <Text ff="monospace" fz="lg">
            {secret?.password}
          </Text>
        </Stack>
      </Modal>
    </Stack>
  );
}

function CreateUserModal(props: {
  readonly opened: boolean;
  readonly roleOptions: readonly { value: string; label: string }[];
  readonly onClose: () => void;
  readonly onCreated: (created: { email: string; temporaryPassword: string }) => Promise<void>;
}): ReactElement {
  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: '', fullName: '', roleIds: [] },
  });
  const create = useMutation({
    mutationFn: createUser,
    onSuccess: async (created) => {
      form.reset();
      await props.onCreated(created);
    },
    onError: notifyError,
  });
  const onSubmit = form.handleSubmit((values) => {
    create.mutate(values);
  });
  return (
    <Modal opened={props.opened} onClose={props.onClose} title="New user">
      <form onSubmit={(event) => void onSubmit(event)}>
        <Stack>
          <TextInput
            label="Full name"
            {...form.register('fullName')}
            error={form.formState.errors.fullName?.message}
          />
          <TextInput
            label="Email"
            {...form.register('email')}
            error={form.formState.errors.email?.message}
          />
          <Controller
            control={form.control}
            name="roleIds"
            render={({ field }) => (
              <MultiSelect
                label="Roles"
                data={[...props.roleOptions]}
                value={field.value}
                onChange={field.onChange}
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

function EditRolesForm(props: {
  readonly user: UserSummary;
  readonly roleOptions: readonly { value: string; label: string }[];
  readonly onSaved: () => Promise<void>;
}): ReactElement {
  const [roleIds, setRoleIds] = useState<string[]>(props.user.roles.map((role) => role.id));
  const save = useMutation({
    mutationFn: () => setUserRoles(props.user.id, roleIds),
    onSuccess: async () => {
      notifySuccess('Roles updated');
      await props.onSaved();
    },
    onError: notifyError,
  });
  return (
    <Stack>
      <MultiSelect
        label="Roles"
        data={[...props.roleOptions]}
        value={roleIds}
        onChange={setRoleIds}
      />
      <Text size="xs" c="dimmed">
        Combinations that break a segregation-of-duties rule are rejected by the server.
      </Text>
      <Button
        onClick={() => {
          save.mutate();
        }}
        loading={save.isPending}
      >
        Save
      </Button>
    </Stack>
  );
}
