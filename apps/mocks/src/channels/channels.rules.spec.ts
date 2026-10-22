import { ChannelOutcome, Currency } from '@ircub/shared';

import {
  dayOf,
  perturb,
  scenarioForAmount,
  sign,
  statusOnCheck,
  toCsv,
  verifySignature,
} from './channels.rules';

import type { StatementLine } from './channels.types';

describe('scenario triggers', () => {
  it('maps amount suffixes to outcomes', () => {
    expect(scenarioForAmount('100.00')).toEqual({
      outcome: 'SUCCESS',
      sendCallback: true,
      statusCheckErrors: false,
    });
    expect(scenarioForAmount('100.99')).toEqual({
      outcome: 'FAILED',
      sendCallback: true,
      statusCheckErrors: false,
    });
    expect(scenarioForAmount('100.77')).toEqual({
      outcome: 'SUCCESS',
      sendCallback: false,
      statusCheckErrors: false,
    });
    expect(scenarioForAmount('100.66')).toEqual({
      outcome: 'SUCCESS',
      sendCallback: false,
      statusCheckErrors: true,
    });
  });

  it('reports PENDING twice then the outcome on status checks', () => {
    expect(statusOnCheck(1, 'SUCCESS')).toBe(ChannelOutcome.PENDING);
    expect(statusOnCheck(2, 'SUCCESS')).toBe(ChannelOutcome.PENDING);
    expect(statusOnCheck(3, 'SUCCESS')).toBe(ChannelOutcome.SUCCESS);
  });
});

describe('HMAC signing', () => {
  const body = JSON.stringify({ txnRef: 'BNK-1', status: 'SUCCESS' });

  it('verifies a valid signature and rejects tampering or the wrong secret', () => {
    const signature = sign(body, 'secret-1');
    expect(verifySignature(body, signature, 'secret-1')).toBe(true);
    expect(verifySignature(`${body} `, signature, 'secret-1')).toBe(false);
    expect(verifySignature(body, signature, 'secret-2')).toBe(false);
    expect(verifySignature(body, 'zz', 'secret-1')).toBe(false);
  });
});

describe('statements', () => {
  const lines: StatementLine[] = [
    {
      txnRef: 'BNK-A',
      date: '2026-10-20',
      amount: '100.00',
      currency: Currency.SOS,
      controlNumber: '000000000195',
      status: ChannelOutcome.SUCCESS,
    },
    {
      txnRef: 'BNK-B',
      date: '2026-10-20',
      amount: '200.00',
      currency: Currency.SOS,
      controlNumber: '000000000292',
      status: ChannelOutcome.SUCCESS,
    },
    {
      txnRef: 'BNK-C',
      date: '2026-10-20',
      amount: '300.00',
      currency: Currency.SOS,
      controlNumber: '000000000389',
      status: ChannelOutcome.SUCCESS,
    },
  ];

  it('perturbation drops the first line, nudges the second by 0.01 and appends an unknown line', () => {
    const result = perturb(lines);
    expect(result.map((l) => l.txnRef)).toEqual(['BNK-B', 'BNK-C', 'BNK-A-EXTRA']);
    expect(result[0]?.amount).toBe('200.01');
  });

  it('renders CSV with the shared column order', () => {
    expect(toCsv(lines.slice(0, 1))).toBe(
      'txn_ref,date,amount,currency,control_number,status\nBNK-A,2026-10-20,100.00,SOS,000000000195,SUCCESS\n',
    );
    expect(dayOf('2026-10-20T10:11:12.000Z')).toBe('2026-10-20');
  });
});
