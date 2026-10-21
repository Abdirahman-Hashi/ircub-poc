import { Alert, Button, Card, FileInput, Group, Stack, Table, Text } from '@mantine/core';
import { IconDownload, IconFileTypeCsv } from '@tabler/icons-react';
import { type ReactElement, useState } from 'react';

import { csvBlob, downloadBlob } from '../lib/download';
import { notifyError, notifySuccess } from '../lib/notify';

import type { CsvUploaderProps, UploadStage } from './CsvUploader.types';
import type { CsvImportSummaryView } from '../api/types';

const REJECTED_FILE = 'rejected-rows.csv';
const PREVIEW_ROWS = 50;

/**
 * Drop CSV → dry-run preview (row, status, reason) → confirm → final summary with a
 * downloadable rejected-rows report (brief Module 3.3 "real-time validation", D12).
 */
export function CsvUploader(props: CsvUploaderProps): ReactElement {
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<UploadStage>('pick');
  const [summary, setSummary] = useState<CsvImportSummaryView | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (
    action: () => Promise<CsvImportSummaryView>,
    nextStage: UploadStage,
  ): Promise<void> => {
    setBusy(true);
    try {
      const result = await action();
      setSummary(result);
      setStage(nextStage);
      if (nextStage === 'done') {
        notifySuccess(`Imported ${result.accepted} of ${result.totalRows} rows`);
      }
    } catch (caught: unknown) {
      notifyError(caught);
    } finally {
      setBusy(false);
    }
  };

  const reset = (): void => {
    setFile(null);
    setSummary(null);
    setStage('pick');
  };

  const downloadRejected = (): void => {
    if (summary === null) {
      return;
    }
    const lines = [
      'row,field,reason,message',
      ...summary.rejected.map(
        (r) => `${r.row},${r.field ?? ''},${r.reason},"${r.message.replace(/"/g, '""')}"`,
      ),
    ];
    downloadBlob(csvBlob(lines), REJECTED_FILE);
  };

  return (
    <Stack>
      <Card withBorder>
        <Group align="flex-end">
          <FileInput
            label="CSV file"
            placeholder="Choose a file"
            accept=".csv,text/csv"
            leftSection={<IconFileTypeCsv size={16} />}
            value={file}
            onChange={(next) => {
              setFile(next);
              setSummary(null);
              setStage('pick');
            }}
            w={320}
          />
          <Button
            disabled={file === null}
            loading={busy && stage === 'pick'}
            onClick={() => file !== null && void run(() => props.onDryRun(file), 'preview')}
          >
            Validate (dry run)
          </Button>
          {props.onTemplate !== undefined && (
            <Button
              variant="subtle"
              leftSection={<IconDownload size={16} />}
              onClick={() =>
                void props
                  .onTemplate?.()
                  .then((blob) => {
                    downloadBlob(blob, props.templateFileName ?? 'template.csv');
                  })
                  .catch(notifyError)
              }
            >
              Template
            </Button>
          )}
        </Group>
      </Card>

      {summary !== null && (
        <Card withBorder>
          <Stack>
            <Group justify="space-between">
              <Text fw={500}>
                {stage === 'preview' ? 'Preview' : 'Import result'}: {summary.accepted} accepted,{' '}
                {summary.rejected.length} rejected of {summary.totalRows}
              </Text>
              <Group>
                {summary.rejected.length > 0 && (
                  <Button
                    variant="subtle"
                    size="xs"
                    leftSection={<IconDownload size={14} />}
                    onClick={downloadRejected}
                  >
                    Rejected rows
                  </Button>
                )}
                {stage === 'preview' && (
                  <Button
                    size="xs"
                    loading={busy}
                    disabled={summary.accepted === 0}
                    onClick={() => file !== null && void run(() => props.onConfirm(file), 'done')}
                  >
                    Confirm import ({summary.accepted} rows)
                  </Button>
                )}
                {stage === 'done' && (
                  <Button size="xs" variant="light" onClick={reset}>
                    Upload another
                  </Button>
                )}
              </Group>
            </Group>
            {stage === 'preview' && (
              <Alert color="blue">
                Nothing has been saved yet. Rejected rows are skipped; accepted rows are imported
                when you confirm.
              </Alert>
            )}
            {summary.rejected.length > 0 && (
              <Table withTableBorder striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Row</Table.Th>
                    <Table.Th>Field</Table.Th>
                    <Table.Th>Reason</Table.Th>
                    <Table.Th>Message</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {summary.rejected.slice(0, PREVIEW_ROWS).map((row) => (
                    <Table.Tr key={row.row}>
                      <Table.Td>{row.row}</Table.Td>
                      <Table.Td ff="monospace">{row.field ?? ''}</Table.Td>
                      <Table.Td ff="monospace">{row.reason}</Table.Td>
                      <Table.Td>{row.message}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
