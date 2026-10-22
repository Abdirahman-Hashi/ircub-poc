import { describe, expect, it } from 'vitest';

import { diffSnapshots, shortHash } from './audit.rules';

describe('diffSnapshots', () => {
  it('lists only the fields whose value changed, sorted by name', () => {
    const changes = diffSnapshots(
      { id: 'p1', name: 'Ali', phone: '+252', status: 'ACTIVE' },
      { id: 'p1', name: 'Ali', phone: '+253', status: 'SUSPENDED' },
    );
    expect(changes).toEqual([
      { field: 'phone', before: '"+252"', after: '"+253"' },
      { field: 'status', before: '"ACTIVE"', after: '"SUSPENDED"' },
    ]);
  });

  it('shows every field as added on a create and as removed on a delete', () => {
    expect(diffSnapshots(null, { id: 'x', amount: '10' })).toEqual([
      { field: 'amount', before: null, after: '"10"' },
      { field: 'id', before: null, after: '"x"' },
    ]);
    expect(diffSnapshots({ id: 'x' }, null)).toEqual([{ field: 'id', before: '"x"', after: null }]);
  });

  it('compares nested values structurally', () => {
    expect(diffSnapshots({ data: { a: 1 } }, { data: { a: 1 } })).toEqual([]);
    expect(diffSnapshots({ data: { a: 1 } }, { data: { a: 2 } })).toHaveLength(1);
  });
});

describe('shortHash', () => {
  it('keeps both ends of a long hash and short strings untouched', () => {
    expect(shortHash('abcdef0123456789', 4)).toBe('abcd…6789');
    expect(shortHash('abcd', 4)).toBe('abcd');
  });
});
