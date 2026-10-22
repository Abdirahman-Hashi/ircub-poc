import { Currency } from '@ircub/shared';

import { isBalanced, ledgerFor, referenceFor, shouldFail } from './fmis.rules';

const line = (glCode: string, debit: string, credit: string) => ({
  glCode,
  debit,
  credit,
  currency: Currency.SOS,
  reference: 'ref',
});

describe('fmis rules', () => {
  it('accepts balanced journals and rejects unbalanced ones', () => {
    expect(isBalanced([line('1010', '100.00', '0'), line('4100', '0', '100.00')])).toBe(true);
    expect(isBalanced([line('1010', '100.00', '0'), line('4100', '0', '99.99')])).toBe(false);
  });

  it('fails on the flag or a date ending in 13', () => {
    expect(shouldFail('2026-10-13', undefined)).toBe(true);
    expect(shouldFail('2026-10-14', '1')).toBe(true);
    expect(shouldFail('2026-10-14', undefined)).toBe(false);
  });

  it('derives the same reference for the same batch', () => {
    const id = '0b1e7968-d1aa-4c0e-9a7e-000000000001';
    expect(referenceFor(id)).toBe(referenceFor(id));
    expect(referenceFor(id)).toBe('FMIS-0B1E7968');
  });

  it('totals the ledger per GL for one day only', () => {
    const journals = [
      {
        batchId: 'a',
        fmisReference: 'x',
        date: '2026-10-21',
        postedAt: '',
        lines: [line('1010', '10.00', '0'), line('4100', '0', '10.00')],
      },
      {
        batchId: 'b',
        fmisReference: 'y',
        date: '2026-10-21',
        postedAt: '',
        lines: [line('1010', '5.00', '0'), line('4200', '0', '5.00')],
      },
      {
        batchId: 'c',
        fmisReference: 'z',
        date: '2026-10-22',
        postedAt: '',
        lines: [line('1010', '1.00', '0'), line('4100', '0', '1.00')],
      },
    ];
    expect(ledgerFor(journals, '2026-10-21')).toEqual([
      { glCode: '1010', debit: '15.00', credit: '0.00' },
      { glCode: '4100', debit: '0.00', credit: '10.00' },
      { glCode: '4200', debit: '0.00', credit: '5.00' },
    ]);
  });
});
