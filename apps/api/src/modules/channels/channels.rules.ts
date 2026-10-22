import { createHmac, timingSafeEqual } from 'node:crypto';

import { CHANNEL } from '@ircub/shared';

import { stripBom } from '../../common/csv/csv.rules';

import { CHANNELS } from './channels.constants';

import type { StatementRecord } from './channels.types';

/** Constant-time HMAC-SHA256 check over the raw body (standards §5). */
export function verifyCallbackSignature(
  rawBody: Buffer | string,
  signature: string | undefined,
  secret: string,
): boolean {
  if (signature === undefined || signature.length === 0) {
    return false;
  }
  const expected = createHmac(CHANNEL.SIGNATURE_ALGORITHM, secret).update(rawBody).digest();
  let given: Buffer;
  try {
    given = Buffer.from(signature, 'hex');
  } catch {
    return false;
  }
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Parses a channel statement CSV (header row first) into records; tolerant of a BOM and blank lines. */
export function parseStatementCsv(text: string): StatementRecord[] {
  const lines = stripBom(text)
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  const [header, ...rows] = lines;
  if (header === undefined) {
    return [];
  }
  const columns = header.split(CHANNELS.CSV_DELIMITER).map((c) => c.trim().toLowerCase());
  const index = (name: string): number => columns.indexOf(name);
  const [refIdx, dateIdx, amountIdx, currencyIdx, controlIdx, statusIdx] =
    CHANNEL.STATEMENT_COLUMNS.map(index);
  if (
    [refIdx, dateIdx, amountIdx, currencyIdx, controlIdx, statusIdx].some(
      (i) => i === undefined || i < 0,
    )
  ) {
    throw new Error('statement is missing required columns');
  }
  return rows.map((row) => {
    const cells = row.split(CHANNELS.CSV_DELIMITER).map((c) => c.trim());
    return {
      txnRef: cells[refIdx ?? 0] ?? '',
      date: cells[dateIdx ?? 0] ?? '',
      amount: cells[amountIdx ?? 0] ?? '',
      currency: cells[currencyIdx ?? 0] ?? '',
      controlNumber: cells[controlIdx ?? 0] ?? '',
      status: cells[statusIdx ?? 0] ?? '',
    };
  });
}

export function callbackUrlFor(apiPublicUrl: string, channel: string): string {
  return `${apiPublicUrl.replace(/\/$/, '')}${CHANNELS.CALLBACK_PATH}/${channel}`;
}
