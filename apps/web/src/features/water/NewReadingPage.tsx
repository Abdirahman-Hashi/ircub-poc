import { Alert, Button, Card, Group, NumberInput, Select, Stack, Text } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { type ReactElement, useState } from 'react';

import { MeterStatus, ReadingType } from '@ircub/shared';

import { QUERY_KEYS } from '../../api/query-keys.constants';
import { createReading, listWaterAccounts, previewReading } from '../../api/water.api';
import { ROUTES } from '../../app/routes.constants';
import { PageHeader } from '../../components/PageHeader';
import { formatDate, toDateInput } from '../../lib/format';
import { notifyError, notifySuccess } from '../../lib/notify';

import type { ReadingPreview } from '../../api/types';

const SEARCH_LIMIT = 20;

export function NewReadingPage(): ReactElement {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [meterId, setMeterId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | null>(new Date());
  const [value, setValue] = useState<number | string>('');
  const [type, setType] = useState<ReadingType>(ReadingType.NORMAL);
  const [preview, setPreview] = useState<ReadingPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const accounts = useQuery({
    queryKey: QUERY_KEYS.waterAccounts({ search, limit: SEARCH_LIMIT }),
    queryFn: () =>
      listWaterAccounts({
        page: 1,
        pageSize: SEARCH_LIMIT,
        ...(search.length > 0 ? { search } : {}),
      }),
  });
  const meterOptions = (accounts.data?.items ?? []).flatMap((account) =>
    account.meters
      .filter((m) => m.status === MeterStatus.ACTIVE)
      .map((m) => ({
        value: m.id,
        label: `${m.serial} · ${account.accountNumber} · ${account.payer.name}`,
      })),
  );
  const selectedMeter = (accounts.data?.items ?? [])
    .flatMap((a) => a.meters)
    .find((m) => m.id === meterId);
  const input =
    meterId !== null && date !== null && value !== ''
      ? { meterId, readingDate: toDateInput(date), readingValue: Number(value), type }
      : null;

  const run = async (action: 'preview' | 'save'): Promise<void> => {
    if (input === null) {
      return;
    }
    setBusy(true);
    try {
      if (action === 'preview') {
        setPreview(await previewReading(input));
      } else {
        const saved = await createReading(input);
        notifySuccess(
          `Reading saved: ${saved.consumption} units${saved.abnormal ? ' (abnormal — flagged)' : ''}`,
        );
        await navigate({ to: ROUTES.WATER_READINGS });
      }
    } catch (caught: unknown) {
      setPreview(null);
      notifyError(caught);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack maw={640}>
      <PageHeader title="Capture meter reading" />
      <Card withBorder>
        <Stack>
          <Select
            label="Meter"
            placeholder="Search by account, payer or serial"
            searchable
            searchValue={search}
            onSearchChange={setSearch}
            data={meterOptions}
            value={meterId}
            onChange={(v) => {
              setMeterId(v);
              setPreview(null);
            }}
            nothingFoundMessage="No active meters"
          />
          {selectedMeter !== undefined && (
            <Text size="sm" c="dimmed">
              Previous reading:{' '}
              <strong>
                {selectedMeter.lastReading?.readingValue ?? selectedMeter.initialReading}
              </strong>
              {selectedMeter.lastReading !== null
                ? ` on ${formatDate(selectedMeter.lastReading.readingDate)}`
                : ' (initial reading)'}{' '}
              · dial {selectedMeter.maxDigits} digits
            </Text>
          )}
          <Group grow>
            <DateInput
              label="Reading date"
              value={date}
              onChange={(d) => {
                setDate(d === null ? null : new Date(d));
              }}
              maxDate={new Date()}
              valueFormat="YYYY-MM-DD"
            />
            <NumberInput
              label="Reading value"
              value={value}
              onChange={setValue}
              min={0}
              hideControls
            />
            <Select
              label="Type"
              data={Object.values(ReadingType)}
              value={type}
              onChange={(v) => {
                setType((v as ReadingType | null) ?? ReadingType.NORMAL);
              }}
            />
          </Group>
          <Text size="xs" c="dimmed">
            ROLLOVER when the dial wrapped past its maximum; REPLACEMENT for the first reading on a
            newly installed meter.
          </Text>
          {preview !== null && (
            <Alert
              color={preview.abnormal ? 'orange' : 'teal'}
              title={`Consumption: ${preview.consumption} units`}
            >
              {preview.abnormal
                ? preview.abnormalReason
                : 'Within the normal range for this meter.'}
            </Alert>
          )}
          <Group>
            <Button
              variant="light"
              onClick={() => void run('preview')}
              loading={busy}
              disabled={input === null}
            >
              Preview
            </Button>
            <Button onClick={() => void run('save')} loading={busy} disabled={input === null}>
              Save reading
            </Button>
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
}
