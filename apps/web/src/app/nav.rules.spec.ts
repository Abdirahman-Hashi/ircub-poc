import { describe, expect, it } from 'vitest';

import { PERMISSIONS, type PermissionCode } from '@ircub/shared';

import { NAV_ITEMS } from './nav';
import { filterNav, isNavActive } from './nav.rules';
import { ROUTES } from './routes.constants';

describe('filterNav', () => {
  it('shows only the items whose permission the user holds', () => {
    const held = new Set<PermissionCode>([PERMISSIONS.PAYERS_VIEW, PERMISSIONS.PAYMENTS_VIEW]);
    const visible = filterNav(NAV_ITEMS, (code) => held.has(code));

    // Payments and Reversals both need payments.view, so three items are visible.
    expect(visible.map((item) => item.label)).toEqual(['Payers', 'Payments', 'Reversals']);
  });

  it('shows nothing to a user with no permissions', () => {
    expect(filterNav(NAV_ITEMS, () => false)).toHaveLength(0);
  });

  it('preserves the declared order', () => {
    const visible = filterNav(NAV_ITEMS, () => true);
    expect(visible).toEqual(NAV_ITEMS);
  });
});

describe('isNavActive', () => {
  it('matches the item path and its sub-paths by top-level section', () => {
    expect(isNavActive('/admin/roles', ROUTES.ADMIN_USERS)).toBe(true);
    expect(isNavActive('/payers/123', ROUTES.PAYERS)).toBe(true);
    expect(isNavActive('/payments', ROUTES.PAYERS)).toBe(false);
  });
});
