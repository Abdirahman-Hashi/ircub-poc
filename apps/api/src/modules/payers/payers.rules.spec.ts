import { DuplicateMatchField } from '@ircub/shared';

import {
  findDuplicateCandidates,
  normaliseEmail,
  normaliseNationalId,
  normalisePhone,
} from './payers.rules';

const CC = '+252';

describe('normalisePhone', () => {
  it('strips formatting and keeps an international number', () => {
    expect(normalisePhone(' +252 61 234-5678 ', CC)).toBe('+252612345678');
  });

  it('replaces a local trunk prefix with the country code', () => {
    expect(normalisePhone('0612345678', CC)).toBe('+252612345678');
    expect(normalisePhone('612345678', CC)).toBe('+252612345678');
  });

  it('rejects garbage', () => {
    expect(normalisePhone('12', CC)).toBeNull();
    expect(normalisePhone('+0123', CC)).toBeNull();
  });
});

describe('normaliseEmail / normaliseNationalId', () => {
  it('lower-cases and trims; empty becomes null', () => {
    expect(normaliseEmail('  Amina@Example.COM ')).toBe('amina@example.com');
    expect(normaliseEmail('')).toBeNull();
    expect(normaliseEmail(undefined)).toBeNull();
    expect(normaliseNationalId(' ab 12 cd ')).toBe('AB12CD');
  });
});

describe('findDuplicateCandidates', () => {
  const existing = [
    { id: 'p1', phone: '+252611111111', email: 'a@x.com', nationalId: 'N1' },
    { id: 'p2', phone: '+252622222222', email: 'b@x.com', nationalId: null },
  ];

  it('matches on each normalised field independently', () => {
    const found = findDuplicateCandidates(
      { phone: '+252611111111', email: 'b@x.com', nationalId: 'N1' },
      existing,
    );
    expect(found).toEqual([
      { matchedPayerId: 'p1', matchField: DuplicateMatchField.PHONE },
      { matchedPayerId: 'p1', matchField: DuplicateMatchField.NATIONAL_ID },
      { matchedPayerId: 'p2', matchField: DuplicateMatchField.EMAIL },
    ]);
  });

  it('never matches null fields and ignores the payer itself', () => {
    expect(
      findDuplicateCandidates(
        { id: 'p2', phone: '+252622222222', email: null, nationalId: null },
        existing,
      ),
    ).toEqual([]);
  });
});
