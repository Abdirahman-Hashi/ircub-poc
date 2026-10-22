import { createHmac } from 'node:crypto';

import { callbackUrlFor, parseStatementCsv, verifyCallbackSignature } from './channels.rules';

describe('verifyCallbackSignature', () => {
  const secret = 'shared-secret';
  const body = JSON.stringify({ txnRef: 'BNK-1', status: 'SUCCESS', amount: '10.00' });
  const signature = createHmac('sha256', secret).update(body).digest('hex');

  it('accepts a valid signature', () => {
    expect(verifyCallbackSignature(body, signature, secret)).toBe(true);
    expect(verifyCallbackSignature(Buffer.from(body), signature, secret)).toBe(true);
  });

  it('rejects a tampered body, a wrong secret, a missing or malformed header', () => {
    expect(verifyCallbackSignature(body.replace('10.00', '10.01'), signature, secret)).toBe(false);
    expect(verifyCallbackSignature(body, signature, 'other-secret')).toBe(false);
    expect(verifyCallbackSignature(body, undefined, secret)).toBe(false);
    expect(verifyCallbackSignature(body, 'not-hex', secret)).toBe(false);
    expect(verifyCallbackSignature(body, signature.slice(2), secret)).toBe(false);
  });
});

describe('parseStatementCsv', () => {
  it('parses the shared column layout and ignores blank lines / BOM', () => {
    const csv =
      '﻿txn_ref,date,amount,currency,control_number,status\nBNK-1,2026-10-20,100.00,SOS,000000000195,SUCCESS\n\n';
    expect(parseStatementCsv(csv)).toEqual([
      {
        txnRef: 'BNK-1',
        date: '2026-10-20',
        amount: '100.00',
        currency: 'SOS',
        controlNumber: '000000000195',
        status: 'SUCCESS',
      },
    ]);
  });

  it('rejects a file without the required columns', () => {
    expect(() => parseStatementCsv('a,b\n1,2\n')).toThrow('missing required columns');
  });

  it('builds the callback url per channel', () => {
    expect(callbackUrlFor('http://api:3000/', 'BANK')).toBe(
      'http://api:3000/payments/callback/BANK',
    );
  });
});
