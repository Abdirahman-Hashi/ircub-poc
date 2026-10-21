import { describe, expect, it } from 'vitest';

import { PERMISSIONS, type PermissionCode } from '@ircub/shared';

import { NAV_ITEMS } from './nav';
import { filterNav } from './nav.rules';

describe('filterNav', () => {
  it('shows only the items whose permission the user holds', () => {
    const held = new Set<PermissionCode>([PERMISSIONS.PAYERS_VIEW, PERMISSIONS.PAYMENTS_VIEW]);
    const visible = filterNav(NAV_ITEMS, (code) => held.has(code));

    expect(visible.map((item) => item.permission)).toEqual([
      PERMISSIONS.PAYERS_VIEW,
      PERMISSIONS.PAYMENTS_VIEW,
    ]);
  });

  it('shows nothing to a user with no permissions', () => {
    expect(filterNav(NAV_ITEMS, () => false)).toHaveLength(0);
  });

  it('preserves the declared order', () => {
    const visible = filterNav(NAV_ITEMS, () => true);
    expect(visible).toEqual(NAV_ITEMS);
  });
});
