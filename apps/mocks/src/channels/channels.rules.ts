import { createHmac, timingSafeEqual } from 'node:crypto';

import { Decimal } from 'decimal.js';

import { CHANNEL, ChannelOutcome, SCENARIO_SUFFIX } from '@ircub/shared';
import type { FinalChannelOutcome } from '@ircub/shared';

import { CHANNEL_MOCK } from '../mocks.constants';

import type { AmountScenario, StatementLine } from './channels.types';

/** `.99` → FAILED; `.77` → no callback, status PENDING twice then SUCCESS; `.66` → no callback, status always 500. */
export function scenarioForAmount(amount: string): AmountScenario {
  if (amount.endsWith(SCENARIO_SUFFIX.FAILED)) {
    return { outcome: ChannelOutcome.FAILED, sendCallback: true, statusCheckErrors: false };
  }
  if (amount.endsWith(SCENARIO_SUFFIX.NO_CALLBACK)) {
    return { outcome: ChannelOutcome.SUCCESS, sendCallback: false, statusCheckErrors: false };
  }
  if (amount.endsWith(SCENARIO_SUFFIX.NO_CALLBACK_STATUS_ERROR)) {
    return { outcome: ChannelOutcome.SUCCESS, sendCallback: false, statusCheckErrors: true };
  }
  return { outcome: ChannelOutcome.SUCCESS, sendCallback: true, statusCheckErrors: false };
}

/** Status reported on the n-th check (1-based) for a no-callback payment: PENDING twice, then the outcome. */
export function statusOnCheck(check: number, finalOutcome: FinalChannelOutcome): ChannelOutcome {
  return check <= CHANNEL_MOCK.PENDING_CHECKS_BEFORE_SUCCESS
    ? ChannelOutcome.PENDING
    : finalOutcome;
}

export function sign(body: string, secret: string): string {
  return createHmac(CHANNEL.SIGNATURE_ALGORITHM, secret).update(body).digest('hex');
}

export function verifySignature(body: string, signature: string, secret: string): boolean {
  const expected = Buffer.from(sign(body, secret), 'hex');
  const given = Buffer.from(signature, 'hex');
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Perturbs a statement for the reconciliation demo: drop one line, add an unknown one, nudge one amount. */
export function perturb(lines: readonly StatementLine[]): StatementLine[] {
  const [first, second, ...rest] = lines;
  const result: StatementLine[] = [];
  if (first !== undefined) {
    // first line is dropped → MISSING_IN_CHANNEL on the IRCUB side
  }
  if (second !== undefined) {
    result.push({
      ...second,
      amount: new Decimal(second.amount)
        .plus(CHANNEL_MOCK.PERTURB_AMOUNT_DELTA)
        .toFixed(CHANNEL_MOCK.AMOUNT_DECIMALS),
    });
  }
  result.push(...rest);
  const template = first ?? second;
  if (template !== undefined) {
    result.push({
      ...template,
      txnRef: `${template.txnRef}${CHANNEL_MOCK.EXTRA_LINE_REF_SUFFIX}`,
      controlNumber: CHANNEL_MOCK.EXTRA_LINE_CONTROL_NUMBER,
    });
  }
  return result;
}

export function toCsv(lines: readonly StatementLine[]): string {
  const header = CHANNEL.STATEMENT_COLUMNS.join(',');
  const rows = lines.map((line) =>
    [line.txnRef, line.date, line.amount, line.currency, line.controlNumber, line.status].join(','),
  );
  return `${[header, ...rows].join('\n')}\n`;
}

/** Statement date is the UTC calendar day of `paidAt`. */
export function dayOf(iso: string): string {
  return iso.slice(0, 'YYYY-MM-DD'.length);
}
