import { PaymentChannel } from '@ircub/shared';

import { isValidControlNumber, normaliseControlNumber } from '../../common/ids/ids.rules';
import { convertToLocal, isPositive, toDecimal } from '../../common/money/money.rules';
import { isPayable } from '../assessments/assessments.rules';

import { BULK_COLUMN, BULK_REASON } from './bulk-uploads.constants';
import { BULK_MESSAGES } from './bulk-uploads.messages';

import type { RevenueTransactionRow } from './bulk-uploads.schema';
import type { RevenueImportContext } from './bulk-uploads.types';
import type { RowOutcome } from '../../common/csv/csv.types';

/** `(channel, ref)` pairs are what the database keeps unique (D11); keep the same key in memory. */
export function txnRefKey(channel: PaymentChannel, ref: string): string {
  return `${channel}:${ref}`;
}

/** Stored path for an uploaded file: never the original name, which is attacker-controlled. */
export function storedFileName(uploadId: string): string {
  return `${uploadId}.csv`;
}

function reject(field: string, reason: string, message: string): RowOutcome {
  return { ok: false, field, reason, message };
}

/**
 * Business validation of one revenue-transaction row, in template order; the zod schema has
 * already checked shapes. Pure: every lookup comes from the prefetched context, which the
 * accepted row updates (running balance, references seen) for the rows after it.
 */
export function validateRevenueRow(
  row: RevenueTransactionRow,
  context: RevenueImportContext,
): RowOutcome {
  const controlNumber = normaliseControlNumber(row.control_number);
  if (!isValidControlNumber(controlNumber)) {
    return reject(
      BULK_COLUMN.CONTROL_NUMBER,
      BULK_REASON.INVALID_CONTROL_NUMBER,
      BULK_MESSAGES.INVALID_CONTROL_NUMBER,
    );
  }
  const assessment = context.assessments.get(controlNumber);
  if (assessment === undefined) {
    return reject(
      BULK_COLUMN.CONTROL_NUMBER,
      BULK_REASON.UNKNOWN_ASSESSMENT,
      BULK_MESSAGES.UNKNOWN_ASSESSMENT,
    );
  }
  if (!isPayable(assessment.status as Parameters<typeof isPayable>[0])) {
    return reject(
      BULK_COLUMN.CONTROL_NUMBER,
      BULK_REASON.ASSESSMENT_NOT_PAYABLE,
      BULK_MESSAGES.ASSESSMENT_NOT_PAYABLE,
    );
  }
  const amount = toDecimal(row.amount);
  if (!isPositive(amount)) {
    return reject(
      BULK_COLUMN.AMOUNT,
      BULK_REASON.AMOUNT_NOT_POSITIVE,
      BULK_MESSAGES.AMOUNT_NOT_POSITIVE,
    );
  }
  if (row.channel !== PaymentChannel.CASH && row.channel_txn_ref === null) {
    return reject(
      BULK_COLUMN.CHANNEL_TXN_REF,
      BULK_REASON.TXN_REF_REQUIRED,
      BULK_MESSAGES.TXN_REF_REQUIRED,
    );
  }
  if (row.channel_txn_ref !== null) {
    const key = txnRefKey(row.channel, row.channel_txn_ref);
    if (context.seenTxnRefs.has(key)) {
      return reject(
        BULK_COLUMN.CHANNEL_TXN_REF,
        BULK_REASON.DUPLICATE_TXN_REF_IN_FILE,
        BULK_MESSAGES.DUPLICATE_IN_FILE,
      );
    }
    if (context.existingTxnRefs.has(key)) {
      return reject(
        BULK_COLUMN.CHANNEL_TXN_REF,
        BULK_REASON.DUPLICATE_TXN_REF_IN_DB,
        BULK_MESSAGES.DUPLICATE_IN_DB,
      );
    }
  }
  if (
    row.captured_by_email !== null &&
    !context.usersByEmail.has(row.captured_by_email.toLowerCase())
  ) {
    return reject(
      BULK_COLUMN.CAPTURED_BY_EMAIL,
      BULK_REASON.UNKNOWN_CAPTURER,
      BULK_MESSAGES.UNKNOWN_CAPTURER,
    );
  }
  let localAmount = amount;
  if (row.currency !== context.localCurrency) {
    const rate = context.rates.get(row.currency);
    if (rate === undefined) {
      return reject(
        BULK_COLUMN.CURRENCY,
        BULK_REASON.FX_RATE_UNAVAILABLE,
        BULK_MESSAGES.FX_RATE_UNAVAILABLE,
      );
    }
    localAmount = convertToLocal(amount, rate).localAmount;
  }
  if (localAmount.gt(assessment.outstanding)) {
    return reject(BULK_COLUMN.AMOUNT, BULK_REASON.OVERPAYMENT, BULK_MESSAGES.OVERPAYMENT);
  }
  // Accepted: reserve the balance and the reference for later rows in the same file.
  assessment.outstanding = assessment.outstanding.minus(localAmount);
  if (row.channel_txn_ref !== null) {
    context.seenTxnRefs.add(txnRefKey(row.channel, row.channel_txn_ref));
  }
  return { ok: true };
}
