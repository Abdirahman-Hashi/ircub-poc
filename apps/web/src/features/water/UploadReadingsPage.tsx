import { Stack, Text } from '@mantine/core';
import { useQueryClient } from '@tanstack/react-query';

import { downloadReadingsTemplate, importMeterReadings } from '../../api/water.api';
import { CsvUploader } from '../../components/CsvUploader';
import { PageHeader } from '../../components/PageHeader';

import type { ReactElement } from 'react';

const TEMPLATE_FILE = 'meter-readings-template.csv';

export function UploadReadingsPage(): ReactElement {
  const queryClient = useQueryClient();
  return (
    <Stack>
      <PageHeader title="Upload meter readings" />
      <Text c="dimmed" size="sm">
        Columns: meter_serial, reading_date, reading_value, type (NORMAL, ROLLOVER or REPLACEMENT;
        blank = NORMAL). Rows are validated against each meter's previous reading; later rows chain
        on earlier accepted rows for the same meter.
      </Text>
      <CsvUploader
        onDryRun={(file) => importMeterReadings(file, true)}
        onConfirm={async (file) => {
          const result = await importMeterReadings(file, false);
          await queryClient.invalidateQueries({ queryKey: ['readings'] });
          await queryClient.invalidateQueries({ queryKey: ['water-accounts'] });
          return result;
        }}
        onTemplate={downloadReadingsTemplate}
        templateFileName={TEMPLATE_FILE}
      />
    </Stack>
  );
}
