/** Contract with the FMIS (mock) and GL conventions shared by api, mocks and web (D17). */
export const FMIS = {
  JOURNALS_PATH: '/fmis/journals',
  LEDGER_PATH: '/fmis/ledger',
  DATE_QUERY: 'date',
  /** `?fail=1` forces the mock FMIS to answer 500 (retry demo). */
  FAIL_QUERY: 'fail',
  FAIL_ON: '1',
  /** A batch whose date ends in this also fails at the mock FMIS. */
  FAIL_DAY_SUFFIX: '13',
  REFERENCE_PREFIX: 'FMIS-',
  STATUS_POSTED: 'POSTED',
  /** General-ledger codes are 4 to 6 digits. */
  GL_CODE_PATTERN: /^\d{4,6}$/,
} as const;
