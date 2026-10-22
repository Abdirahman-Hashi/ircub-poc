import { CSV_TEMPLATES } from '@ircub/shared';

export const READINGS_API = {
  PATH: 'readings',
  PREVIEW: 'preview',
  /** Mounted under /bulk-uploads to sit beside the revenue importer. */
  BULK_PATH: 'bulk-uploads',
  BULK_METER_READINGS: 'meter-readings',
  BULK_TEMPLATE: 'meter-readings/template.csv',
  SORTABLE: ['readingDate', 'createdAt', 'consumption'] as const,
  TEMPLATE_FILE_NAME: 'meter-readings-template.csv',
} as const;

export const METER_READINGS_TEMPLATE = CSV_TEMPLATES.METER_READINGS;

export const READING_REASON = {
  UNKNOWN_METER: 'UNKNOWN_METER',
  METER_NOT_ACTIVE: 'METER_NOT_ACTIVE',
  READING_BELOW_PREVIOUS: 'READING_BELOW_PREVIOUS',
  READING_INVALID_ROLLOVER: 'READING_INVALID_ROLLOVER',
  DUPLICATE_DATE: 'DUPLICATE_DATE',
  DATE_BEFORE_PREVIOUS: 'DATE_BEFORE_PREVIOUS',
  DATE_IN_FUTURE: 'DATE_IN_FUTURE',
} as const;

export const READING_COLUMN = {
  METER_SERIAL: 'meter_serial',
  READING_DATE: 'reading_date',
  READING_VALUE: 'reading_value',
  TYPE: 'type',
} as const;
