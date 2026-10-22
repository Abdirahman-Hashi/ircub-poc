export const FMIS_MESSAGES = {
  MAPPING_NOT_FOUND: 'GL mapping not found.',
  MAPPING_EXISTS: 'A mapping for this revenue type already starts on that date.',
  MAPPING_MISSING: 'No GL mapping is effective for this revenue type on the batch date.',
  REVENUE_TYPE_NOT_FOUND: 'Revenue type not found.',
  WATER_TYPE_MISSING: 'The WATER revenue type that carries bill payments is not configured.',
  BATCH_NOT_FOUND: 'Journal batch not found.',
  LINE_NOT_FOUND: 'Journal line not found.',
  DUPLICATE_POSTING:
    'A payment in this batch is already on a journal line, or a batch already exists for this day.',
  NOT_RETRYABLE: 'Only FAILED batches can be retried.',
  RANGE_TOO_LONG: 'Date range is too long.',
  RANGE_INVERTED: '`from` must not be after `to`.',
  FMIS_UNAVAILABLE: 'The FMIS is unavailable; please try again later.',
  FMIS_REJECTED: 'The FMIS rejected the journal.',
  POST_EXHAUSTED: 'Posting attempts exhausted.',
} as const;
