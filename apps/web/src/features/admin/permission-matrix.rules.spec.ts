import { describe, expect, it } from 'vitest';

import { PERMISSIONS } from '@ircub/shared';

import { buildMatrixRow, cellState, toggleDirect } from './permission-matrix.rules';

const direct = new Set([PERMISSIONS.BILLING_RUN]);
const inherited = new Set([PERMISSIONS.PAYMENTS_CAPTURE]);

describe('permission matrix', () => {
  it('marks inherited permissions as inherited even if also direct', () => {
    expect(
      cellState(PERMISSIONS.PAYMENTS_CAPTURE, new Set([PERMISSIONS.PAYMENTS_CAPTURE]), inherited),
    ).toBe('inherited');
    expect(cellState(PERMISSIONS.BILLING_RUN, direct, inherited)).toBe('direct');
    expect(cellState(PERMISSIONS.AUDIT_VIEW, direct, inherited)).toBe('none');
  });

  it('builds a row in the given code order', () => {
    const row = buildMatrixRow(
      [PERMISSIONS.AUDIT_VIEW, PERMISSIONS.BILLING_RUN],
      direct,
      inherited,
    );
    expect(row.map((cell) => cell.state)).toEqual(['none', 'direct']);
  });

  it('toggles direct membership but never an inherited cell', () => {
    expect(
      toggleDirect(PERMISSIONS.AUDIT_VIEW, direct, inherited).has(PERMISSIONS.AUDIT_VIEW),
    ).toBe(true);
    expect(
      toggleDirect(PERMISSIONS.BILLING_RUN, direct, inherited).has(PERMISSIONS.BILLING_RUN),
    ).toBe(false);
    expect(toggleDirect(PERMISSIONS.PAYMENTS_CAPTURE, direct, inherited)).toBe(direct);
  });
});
