import { Currency, FmisReconciliationStatus, JournalBatchStatus } from '@ircub/shared';

import {
  collectionLine,
  eligibilityWindowStart,
  daysBetween,
  netCreditByGl,
  netCreditFromLedger,
  nextPostingAttempt,
  reconcile,
  resolveMapping,
  reversalLine,
  statusAfterReversal,
  sumAmounts,
  toFmisPayload,
} from './fmis.rules';

const mapping = (glCode: string, effectiveFrom: string) => ({
  glCode,
  glName: glCode,
  effectiveFrom: new Date(effectiveFrom),
});

describe('resolveMapping', () => {
  const candidates = [
    mapping('4100', '2026-01-01'),
    mapping('4150', '2026-06-01'),
    mapping('4199', '2027-01-01'),
  ];

  it('picks the latest mapping effective on or before the date', () => {
    expect(resolveMapping(candidates, new Date('2026-03-15'))?.glCode).toBe('4100');
    expect(resolveMapping(candidates, new Date('2026-06-01'))?.glCode).toBe('4150');
    expect(resolveMapping(candidates, new Date('2026-12-31'))?.glCode).toBe('4150');
  });

  it('returns null before the first effective date', () => {
    expect(resolveMapping(candidates, new Date('2025-12-31'))).toBeNull();
    expect(resolveMapping([], new Date())).toBeNull();
  });
});

describe('journal lines', () => {
  const payment = {
    id: 'p1',
    controlNumber: '000000000195',
    localAmount: '2500',
    revenueTypeId: 'rt',
  };

  it('debits cash and credits the revenue GL for a collection, two decimals, in the local currency', () => {
    expect(collectionLine(payment, '4100', '1010', Currency.SOS)).toEqual({
      paymentId: 'p1',
      reversalId: null,
      revenueTypeId: 'rt',
      glCode: '4100',
      debitGl: '1010',
      creditGl: '4100',
      amount: '2500.00',
      currency: Currency.SOS,
      reference: '000000000195',
    });
  });

  it('a reversal swaps debit and credit, keeps the amount positive and links the reversal', () => {
    const reversed = reversalLine(collectionLine(payment, '4100', '1010', Currency.SOS), 'rev-1');
    expect(reversed).toMatchObject({
      paymentId: null,
      reversalId: 'rev-1',
      debitGl: '4100',
      creditGl: '1010',
      amount: '2500.00',
    });
  });

  it('builds a balanced FMIS payload: one debit and one credit entry per line', () => {
    const payload = toFmisPayload([
      collectionLine(payment, '4100', '1010', Currency.SOS),
      collectionLine({ ...payment, id: 'p2', localAmount: '10.5' }, '4200', '1010', Currency.SOS),
    ]);
    expect(payload).toHaveLength(4);
    const debit = payload.reduce((sum, line) => sum + Number(line.debit), 0);
    const credit = payload.reduce((sum, line) => sum + Number(line.credit), 0);
    expect(debit).toBe(credit);
    expect(payload[0]).toEqual({
      glCode: '1010',
      debit: '2500.00',
      credit: '0.00',
      currency: Currency.SOS,
      reference: '000000000195',
    });
    expect(sumAmounts([{ amount: '2500' }, { amount: '10.5' }])).toBe('2510.50');
  });
});

describe('posting and reversal status rules', () => {
  it('counts attempts and reports exhaustion at the limit', () => {
    expect(nextPostingAttempt(0, 3)).toEqual({ attempts: 1, exhausted: false });
    expect(nextPostingAttempt(2, 3)).toEqual({ attempts: 3, exhausted: true });
  });

  it('marks the original batch REVERSED only when every line is reversed', () => {
    expect(statusAfterReversal([true, true])).toBe(JournalBatchStatus.REVERSED);
    expect(statusAfterReversal([true, false])).toBe(JournalBatchStatus.POSTED);
    expect(statusAfterReversal([])).toBe(JournalBatchStatus.POSTED);
  });
});

describe('reconciliation', () => {
  const line = (debitGl: string, creditGl: string, amount: string) => ({
    debitGl,
    creditGl,
    amount,
    currency: Currency.SOS,
    reference: 'r',
  });

  it('nets credits minus debits per GL on both sides', () => {
    const ircub = netCreditByGl([
      line('1010', '4100', '100'),
      line('1010', '4200', '50'),
      line('4100', '1010', '10'),
    ]);
    expect(ircub.get('4100')).toBe('90.00');
    expect(ircub.get('4200')).toBe('50.00');
    expect(ircub.get('1010')).toBe('-140.00');
    const fmis = netCreditFromLedger([{ glCode: '4100', debit: '10.00', credit: '100.00' }]);
    expect(fmis.get('4100')).toBe('90.00');
  });

  it('classifies matched, mismatch and missing in FMIS', () => {
    expect(reconcile('90.00', '90.00')).toEqual({
      difference: '0.00',
      status: FmisReconciliationStatus.MATCHED,
    });
    expect(reconcile('90.00', '89.50')).toEqual({
      difference: '0.50',
      status: FmisReconciliationStatus.MISMATCH,
    });
    expect(reconcile('90.00', undefined)).toEqual({
      difference: '90.00',
      status: FmisReconciliationStatus.MISSING_IN_FMIS,
    });
  });

  it('enumerates days inclusively', () => {
    expect(daysBetween('2026-02-27', '2026-03-01')).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
    ]);
    expect(daysBetween('2026-03-02', '2026-03-01')).toEqual([]);
  });
});

describe('eligibilityWindowStart', () => {
  it('starts the sweep catchUpDays before the batch date, or on the date itself for 0', () => {
    expect(eligibilityWindowStart('2026-10-21', 31).toISOString()).toBe('2026-09-20T00:00:00.000Z');
    expect(eligibilityWindowStart('2026-10-21', 0).toISOString()).toBe('2026-10-21T00:00:00.000Z');
    expect(eligibilityWindowStart('2026-03-01', 1).toISOString()).toBe('2026-02-28T00:00:00.000Z');
  });
});
