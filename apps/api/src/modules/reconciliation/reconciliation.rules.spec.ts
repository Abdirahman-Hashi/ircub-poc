import { Currency, ReconciliationLineStatus } from '@ircub/shared';

import { classify, previousUtcDay, utcDayBounds } from './reconciliation.rules';

const ledger = (txnRef: string, amount: string, currency: Currency = Currency.SOS) => ({
  paymentId: `p-${txnRef}`,
  txnRef,
  controlNumber: '000000000000',
  amount,
  currency,
});
const statement = (txnRef: string, amount: string, currency: Currency = Currency.SOS) => ({
  statementLineId: `s-${txnRef}`,
  txnRef,
  controlNumber: '000000000000',
  amount,
  currency,
});

describe('classify', () => {
  it('produces all four statuses from a perturbed statement', () => {
    const result = classify(
      [ledger('A', '100.00'), ledger('B', '50.00'), ledger('C', '10.00')],
      [statement('B', '50.01'), statement('C', '10.00'), statement('X', '7.00')],
    );
    expect(result.summary).toEqual({
      matched: 1,
      missingInIrcub: 1,
      missingInChannel: 1,
      amountMismatch: 1,
    });
    const byRef = new Map(result.lines.map((line) => [line.txnRef, line]));
    expect(byRef.get('A')?.status).toBe(ReconciliationLineStatus.MISSING_IN_CHANNEL);
    expect(byRef.get('B')).toMatchObject({
      status: ReconciliationLineStatus.AMOUNT_MISMATCH,
      ircubAmount: '50.00',
      channelAmount: '50.01',
    });
    expect(byRef.get('C')?.status).toBe(ReconciliationLineStatus.MATCHED);
    expect(byRef.get('X')).toMatchObject({
      status: ReconciliationLineStatus.MISSING_IN_IRCUB,
      paymentId: null,
      statementLineId: 's-X',
    });
  });

  it('treats a currency difference as a mismatch and compares amounts numerically', () => {
    const result = classify(
      [ledger('A', '100.0', Currency.USD)],
      [statement('A', '100', Currency.SOS)],
    );
    expect(result.lines[0]?.status).toBe(ReconciliationLineStatus.AMOUNT_MISMATCH);
    expect(classify([ledger('A', '100.0')], [statement('A', '100')]).summary.matched).toBe(1);
  });

  it('is empty for two empty sides', () => {
    expect(classify([], []).summary).toEqual({
      matched: 0,
      missingInIrcub: 0,
      missingInChannel: 0,
      amountMismatch: 0,
    });
  });
});

describe('day helpers', () => {
  it('previousUtcDay crosses month boundaries', () => {
    expect(previousUtcDay(new Date('2026-03-01T00:30:00Z'))).toBe('2026-02-28');
  });

  it('utcDayBounds spans exactly one day', () => {
    const { start, end } = utcDayBounds('2026-10-21');
    expect(start.toISOString()).toBe('2026-10-21T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-22T00:00:00.000Z');
  });
});
