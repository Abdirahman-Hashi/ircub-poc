import { CSV_TEMPLATES } from './csv-templates.constants';

/** Contract between the API and the (mock) payment channels, shared so both sides agree. */
export const CHANNEL = {
  /** HMAC-SHA256 over the raw callback body, hex encoded. */
  SIGNATURE_HEADER: 'x-signature',
  SIGNATURE_ALGORITHM: 'sha256',
  BANK_PATH: '/bank',
  MOMO_PATH: '/momo',
  PAYMENTS_PATH: '/payments',
  STATEMENTS_PATH: '/statements',
  BANK_REF_PREFIX: 'BNK-',
  MOMO_REF_PREFIX: 'MM-',
  STATEMENT_COLUMNS: CSV_TEMPLATES.CHANNEL_STATEMENT.columns,
  /** Query flag that asks the mock for a deliberately perturbed statement. */
  PERTURB_QUERY: 'perturb',
  DATE_QUERY: 'date',
} as const;

/** Demo scenario triggers encoded in the amount's cents (apps/mocks/CLAUDE.md). */
export const SCENARIO_SUFFIX = {
  FAILED: '.99',
  NO_CALLBACK: '.77',
  NO_CALLBACK_STATUS_ERROR: '.66',
} as const;

/** Forced outcomes for `POST /__scenario`. */
export const ScenarioOutcome = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  TIMEOUT: 'TIMEOUT',
  NO_CALLBACK: 'NO_CALLBACK',
} as const;
export type ScenarioOutcome = (typeof ScenarioOutcome)[keyof typeof ScenarioOutcome];
