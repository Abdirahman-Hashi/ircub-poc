import { Decimal } from 'decimal.js';

import { AssessmentStatus, Currency, PaymentChannel } from '@ircub/shared';

import { BULK_REASON } from './bulk-uploads.constants';
import { storedFileName, txnRefKey, validateRevenueRow } from './bulk-uploads.rules';
import { type RevenueTransactionRow, revenueTransactionRowSchema } from './bulk-uploads.schema';

import type { RevenueImportContext } from './bulk-uploads.types';

describe('revenueTransactionRowSchema', () => {
  const valid = {
    control_number: '000000000195',
    amount: '1000.50',
    currency: 'SOS',
    channel: 'BANK',
    channel_txn_ref: 'BNK-1',
    paid_at: '2026-10-01T10:00:00Z',
    captured_by_email: '',
  };

  it('accepts a well-formed row and normalises optional fields', () => {
    const parsed = revenueTransactionRowSchema.parse(valid);
    expect(parsed.paid_at).toBeInstanceOf(Date);
    expect(parsed.captured_by_email).toBeNull();
  });

  it('rejects a bad amount, unknown currency, unsupported channel and bad date', () => {
    expect(revenueTransactionRowSchema.safeParse({ ...valid, amount: '12.345' }).success).toBe(
      false,
    );
    expect(revenueTransactionRowSchema.safeParse({ ...valid, currency: 'EUR' }).success).toBe(
      false,
    );
    expect(revenueTransactionRowSchema.safeParse({ ...valid, channel: 'BULK' }).success).toBe(
      false,
    );
    expect(revenueTransactionRowSchema.safeParse({ ...valid, paid_at: 'yesterday' }).success).toBe(
      false,
    );
    expect(
      revenueTransactionRowSchema.safeParse({ ...valid, captured_by_email: 'nope' }).success,
    ).toBe(false);
  });
});

describe('bulk upload rules', () => {
  it('keys references by channel so the same ref on two channels is not a duplicate', () => {
    expect(txnRefKey(PaymentChannel.BANK, 'X1')).not.toBe(
      txnRefKey(PaymentChannel.MOBILE_MONEY, 'X1'),
    );
  });

  it('never stores a file under its original name', () => {
    expect(storedFileName('abc')).toBe('abc.csv');
  });
});

describe('validateRevenueRow', () => {
  const buildContext = (overrides: Partial<RevenueImportContext> = {}): RevenueImportContext => ({
    assessments: new Map([
      [
        '000000000195',
        {
          id: 'a1',
          payerId: 'p1',
          controlNumber: '000000000195',
          status: AssessmentStatus.PENDING,
          outstanding: new Decimal('1000'),
        },
      ],
      [
        '000000000292',
        {
          id: 'a2',
          payerId: 'p1',
          controlNumber: '000000000292',
          status: AssessmentStatus.PAID,
          outstanding: new Decimal('0'),
        },
      ],
    ]),
    existingTxnRefs: new Set([txnRefKey(PaymentChannel.BANK, 'IN-DB')]),
    seenTxnRefs: new Set(),
    usersByEmail: new Map([['officer@ircub.test', 'u1']]),
    rates: new Map([[Currency.USD, new Decimal('571.5')]]),
    localCurrency: Currency.SOS,
    uploaderId: 'u0',
    fileName: 'f.csv',
    storedPath: 'uploads/f.csv',
    ...overrides,
  });
  const row = (overrides: Partial<RevenueTransactionRow> = {}): RevenueTransactionRow => ({
    control_number: '000000000195',
    amount: '100.00',
    currency: Currency.SOS,
    channel: PaymentChannel.BANK,
    channel_txn_ref: 'BNK-1',
    paid_at: new Date('2026-10-01T10:00:00Z'),
    captured_by_email: null,
    ...overrides,
  });
  const reasonOf = (outcome: ReturnType<typeof validateRevenueRow>): string | null =>
    outcome.ok ? null : outcome.reason;

  it('accepts a valid row, reserves its balance and remembers its reference', () => {
    const context = buildContext();
    expect(validateRevenueRow(row(), context)).toEqual({ ok: true });
    expect(context.assessments.get('000000000195')?.outstanding.toFixed()).toBe('900');
    expect(context.seenTxnRefs.has(txnRefKey(PaymentChannel.BANK, 'BNK-1'))).toBe(true);
  });

  it('rejects each business rule with its own reason', () => {
    expect(
      reasonOf(validateRevenueRow(row({ control_number: '000000000190' }), buildContext())),
    ).toBe(BULK_REASON.INVALID_CONTROL_NUMBER);
    expect(
      reasonOf(validateRevenueRow(row({ control_number: '000000000389' }), buildContext())),
    ).toBe(BULK_REASON.UNKNOWN_ASSESSMENT);
    expect(
      reasonOf(validateRevenueRow(row({ control_number: '000000000292' }), buildContext())),
    ).toBe(BULK_REASON.ASSESSMENT_NOT_PAYABLE);
    expect(reasonOf(validateRevenueRow(row({ amount: '0.00' }), buildContext()))).toBe(
      BULK_REASON.AMOUNT_NOT_POSITIVE,
    );
    expect(reasonOf(validateRevenueRow(row({ channel_txn_ref: null }), buildContext()))).toBe(
      BULK_REASON.TXN_REF_REQUIRED,
    );
    expect(
      reasonOf(
        validateRevenueRow(
          row(),
          buildContext({ seenTxnRefs: new Set([txnRefKey(PaymentChannel.BANK, 'BNK-1')]) }),
        ),
      ),
    ).toBe(BULK_REASON.DUPLICATE_TXN_REF_IN_FILE);
    expect(reasonOf(validateRevenueRow(row({ channel_txn_ref: 'IN-DB' }), buildContext()))).toBe(
      BULK_REASON.DUPLICATE_TXN_REF_IN_DB,
    );
    expect(
      reasonOf(validateRevenueRow(row({ captured_by_email: 'ghost@ircub.test' }), buildContext())),
    ).toBe(BULK_REASON.UNKNOWN_CAPTURER);
    expect(
      reasonOf(
        validateRevenueRow(row({ currency: Currency.USD }), buildContext({ rates: new Map() })),
      ),
    ).toBe(BULK_REASON.FX_RATE_UNAVAILABLE);
    expect(reasonOf(validateRevenueRow(row({ amount: '1000.01' }), buildContext()))).toBe(
      BULK_REASON.OVERPAYMENT,
    );
  });

  it('converts USD rows at the prefetched rate before the balance check', () => {
    const context = buildContext();
    // 2 USD × 571.5 = 1143 > 1000 outstanding.
    expect(
      reasonOf(validateRevenueRow(row({ currency: Currency.USD, amount: '2.00' }), context)),
    ).toBe(BULK_REASON.OVERPAYMENT);
    expect(validateRevenueRow(row({ currency: Currency.USD, amount: '1.00' }), context)).toEqual({
      ok: true,
    });
    expect(context.assessments.get('000000000195')?.outstanding.toFixed()).toBe('428.5');
  });

  it('a cash row needs no channel reference', () => {
    expect(
      validateRevenueRow(
        row({ channel: PaymentChannel.CASH, channel_txn_ref: null }),
        buildContext(),
      ),
    ).toEqual({ ok: true });
  });
});
