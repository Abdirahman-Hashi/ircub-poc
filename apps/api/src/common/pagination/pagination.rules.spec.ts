import { PAGINATION } from '@ircub/shared';

import { parseSort, toPageSlice } from './pagination.rules';

describe('toPageSlice', () => {
  it('converts page/pageSize to skip/take', () => {
    expect(toPageSlice(3, 10)).toEqual({ skip: 20, take: 10 });
  });

  it('clamps pageSize to the shared maximum and page to at least 1', () => {
    expect(toPageSlice(0, 10_000)).toEqual({ skip: 0, take: PAGINATION.MAX_PAGE_SIZE });
  });
});

describe('parseSort', () => {
  const fallback = { field: 'createdAt', direction: 'desc' } as const;

  it('accepts an allowed field and direction', () => {
    expect(parseSort('email:asc', ['email', 'createdAt'], fallback)).toEqual({
      field: 'email',
      direction: 'asc',
    });
  });

  it('falls back when the field is not allowed', () => {
    expect(parseSort('passwordHash:asc', ['email'], fallback)).toEqual(fallback);
  });

  it('falls back to the default direction when the direction is garbage', () => {
    expect(parseSort('email:sideways', ['email'], fallback)).toEqual({
      field: 'email',
      direction: 'desc',
    });
  });
});
