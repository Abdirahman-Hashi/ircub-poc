import { Badge, Button, Code, Drawer, Group, Stack, Table, Text } from '@mantine/core';
import { IconShieldCheck } from '@tabler/icons-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { type ReactElement, useMemo, useState } from 'react';

import { AuditAction } from '@ircub/shared';

import { listAuditLog, verifyAuditChain } from '../../api/audit.api';
import { QUERY_KEYS } from '../../api/query-keys.constants';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { PageHeader } from '../../components/PageHeader';
import { formatDateTime } from '../../lib/format';
import { notifyError, notifySuccess } from '../../lib/notify';
import { INITIAL_PAGINATION, toPageParams } from '../../lib/pagination';

import { AUDIT_ENTITIES, AUDIT_UI } from './audit.constants';
import { diffSnapshots, shortHash } from './audit.rules';

import type { AuditLogView } from '../../api/types';
import type { FilterField, FilterValues } from '../../components/FilterBar.types';
import type { MRT_ColumnDef } from 'mantine-react-table';

const FIELDS: readonly FilterField[] = [
  {
    name: 'entity',
    label: 'Entity',
    kind: 'select',
    options: AUDIT_ENTITIES.map((entity) => ({ value: entity, label: entity })),
  },
  { name: 'entityId', label: 'Entity id', kind: 'text' },
  { name: 'actorId', label: 'Actor id', kind: 'text' },
  { name: 'from', label: 'From', kind: 'date' },
  { name: 'to', label: 'To', kind: 'date' },
];

/** Auditor's view of the tamper-evident log: who changed what, before/after, and chain verification. */
export function AuditPage(): ReactElement {
  const [pagination, setPagination] = useState(INITIAL_PAGINATION);
  const [filters, setFilters] = useState<FilterValues>({});
  const [selected, setSelected] = useState<AuditLogView | null>(null);
  const params = useMemo(
    () => ({ ...toPageParams(pagination), ...filters }),
    [pagination, filters],
  );
  const rows = useQuery({
    queryKey: QUERY_KEYS.audit(params),
    queryFn: () => listAuditLog(params),
    placeholderData: (previous) => previous,
  });
  const verify = useMutation({
    mutationFn: verifyAuditChain,
    onSuccess: (result) => {
      if (result.ok) {
        notifySuccess(`Chain intact: ${String(result.checked)} rows verified`);
      } else {
        notifyError(
          new Error(
            `Chain broken at seq ${String(result.firstBrokenSeq ?? '?')} after ${String(result.checked)} rows`,
          ),
        );
      }
    },
    onError: notifyError,
  });

  const columns = useMemo<MRT_ColumnDef<AuditLogView>[]>(
    () => [
      { accessorKey: 'seq', header: '#', size: 70 },
      {
        accessorKey: 'createdAt',
        header: 'When',
        Cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      { accessorKey: 'actorEmail', header: 'Actor' },
      { accessorKey: 'entity', header: 'Entity' },
      {
        accessorKey: 'entityId',
        header: 'Entity id',
        Cell: ({ row }) => <Code>{row.original.entityId}</Code>,
      },
      {
        accessorKey: 'action',
        header: 'Action',
        Cell: ({ row }) => (
          <Badge color={AUDIT_UI.ACTION_COLORS[row.original.action]} variant="light">
            {row.original.action}
          </Badge>
        ),
      },
      {
        accessorKey: 'hash',
        header: 'Hash',
        Cell: ({ row }) => <Code>{shortHash(row.original.hash, AUDIT_UI.HASH_EDGE)}</Code>,
      },
    ],
    [],
  );

  return (
    <Stack>
      <PageHeader
        title="Audit log"
        actions={
          <Button
            leftSection={<IconShieldCheck size={16} />}
            variant="light"
            loading={verify.isPending}
            onClick={() => {
              verify.mutate();
            }}
          >
            Verify chain
          </Button>
        }
      />
      <Text c="dimmed" size="sm">
        Every create, update and delete of a business record, hash-chained so tampering is
        detectable. Open a row to see the fields that changed.
      </Text>
      <DataTable
        columns={columns}
        data={rows.data?.items ?? []}
        total={rows.data?.total ?? 0}
        pagination={pagination}
        onPaginationChange={setPagination}
        isLoading={rows.isPending}
        toolbar={
          <FilterBar
            fields={FIELDS}
            values={filters}
            onChange={(next) => {
              setFilters(next);
              setPagination(INITIAL_PAGINATION);
            }}
            onReset={() => {
              setFilters({});
            }}
          />
        }
        rowActions={(row) => (
          <Button
            size="xs"
            variant="subtle"
            onClick={() => {
              setSelected(row);
            }}
          >
            Changes
          </Button>
        )}
      />
      <AuditRowDrawer
        row={selected}
        onClose={() => {
          setSelected(null);
        }}
      />
    </Stack>
  );
}

function AuditRowDrawer(props: {
  readonly row: AuditLogView | null;
  readonly onClose: () => void;
}): ReactElement {
  const row = props.row;
  const changes = row === null ? [] : diffSnapshots(row.before, row.after);
  return (
    <Drawer
      opened={row !== null}
      onClose={props.onClose}
      position="right"
      size="lg"
      title={row === null ? '' : `${row.entity} ${row.action} · #${row.seq}`}
    >
      {row !== null && (
        <Stack>
          <Group gap="xl">
            <Text size="sm">
              <Text span c="dimmed">
                Actor:{' '}
              </Text>
              {row.actorEmail}
            </Text>
            <Text size="sm">
              <Text span c="dimmed">
                When:{' '}
              </Text>
              {formatDateTime(row.createdAt)}
            </Text>
            <Text size="sm">
              <Text span c="dimmed">
                IP:{' '}
              </Text>
              {row.ip ?? '—'}
            </Text>
          </Group>
          <Text size="sm">
            <Text span c="dimmed">
              Entity id:{' '}
            </Text>
            <Code>{row.entityId}</Code>
          </Text>
          <Table withTableBorder striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Field</Table.Th>
                <Table.Th>Before</Table.Th>
                <Table.Th>After</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {changes.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={3}>
                    <Text c="dimmed" size="sm">
                      No field changed (touch-only update).
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                changes.map((change) => (
                  <Table.Tr key={change.field}>
                    <Table.Td ff="monospace">{change.field}</Table.Td>
                    <Table.Td>
                      <Code c={change.before === null ? 'dimmed' : 'red'}>
                        {change.before ?? '—'}
                      </Code>
                    </Table.Td>
                    <Table.Td>
                      <Code c={change.after === null ? 'dimmed' : 'green'}>
                        {change.after ?? '—'}
                      </Code>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
          <Text size="xs" c="dimmed">
            {row.action === AuditAction.CREATE ? 'Created' : 'Changed'} record hash{' '}
            <Code>{row.hash}</Code> chained to{' '}
            <Code>{shortHash(row.prevHash, AUDIT_UI.HASH_EDGE)}</Code>
          </Text>
        </Stack>
      )}
    </Drawer>
  );
}
