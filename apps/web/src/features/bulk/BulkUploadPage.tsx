import { Stack, Table, Text } from '@mantine/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  downloadTemplate,
  importRevenueTransactions,
  listBulkUploads,
} from '../../api/bulk-uploads.api';
import { QUERY_KEYS } from '../../api/query-keys.constants';
import { CsvUploader } from '../../components/CsvUploader';
import { PageHeader } from '../../components/PageHeader';
import { formatDateTime } from '../../lib/format';
import { INITIAL_PAGINATION, toPageParams } from '../../lib/pagination';

import type { ReactElement } from 'react';

const TEMPLATE_FILE = 'revenue-transactions-template.csv';

export function BulkUploadPage(): ReactElement {
  const queryClient = useQueryClient();
  const params = toPageParams(INITIAL_PAGINATION);
  const uploads = useQuery({
    queryKey: QUERY_KEYS.bulkUploads(params),
    queryFn: () => listBulkUploads(params),
  });

  return (
    <Stack>
      <PageHeader title="Bulk upload: revenue transactions" />
      <Text c="dimmed" size="sm">
        Columns: control_number, amount, currency, channel, channel_txn_ref, paid_at,
        captured_by_email (optional). Validate first; only accepted rows are imported.
      </Text>
      <CsvUploader
        onDryRun={(file) => importRevenueTransactions(file, true)}
        onConfirm={async (file) => {
          const result = await importRevenueTransactions(file, false);
          await queryClient.invalidateQueries({ queryKey: ['bulk-uploads'] });
          await queryClient.invalidateQueries({ queryKey: ['payments'] });
          return result;
        }}
        onTemplate={downloadTemplate}
        templateFileName={TEMPLATE_FILE}
      />
      <Text fw={500}>Previous uploads</Text>
      <Table withTableBorder striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>When</Table.Th>
            <Table.Th>File</Table.Th>
            <Table.Th>Rows</Table.Th>
            <Table.Th>Accepted</Table.Th>
            <Table.Th>Rejected</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {(uploads.data?.items ?? []).map((u) => (
            <Table.Tr key={u.id}>
              <Table.Td>{formatDateTime(u.createdAt)}</Table.Td>
              <Table.Td>{u.fileName}</Table.Td>
              <Table.Td>{u.totalRows}</Table.Td>
              <Table.Td>{u.accepted}</Table.Td>
              <Table.Td>{u.rejected}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}
