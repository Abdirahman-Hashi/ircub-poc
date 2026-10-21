import { PaymentChannel } from '@ircub/shared';

import { storedFileName, txnRefKey } from './bulk-uploads.rules';
import { revenueTransactionRowSchema } from './bulk-uploads.schema';

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
