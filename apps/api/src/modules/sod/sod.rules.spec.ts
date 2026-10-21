import { PERMISSIONS } from '@ircub/shared';

import { findConflicts, normalisePair } from './sod.rules';

const rule = {
  permissionACode: PERMISSIONS.REVERSALS_APPROVE,
  permissionBCode: PERMISSIONS.REVERSALS_CAPTURE,
  description: 'capture ⟂ approve',
};

describe('findConflicts', () => {
  it('flags a user holding both sides of a rule', () => {
    const held = new Set([
      PERMISSIONS.REVERSALS_CAPTURE,
      PERMISSIONS.REVERSALS_APPROVE,
      PERMISSIONS.PAYERS_VIEW,
    ]);
    expect(findConflicts('u1', held, [rule])).toEqual([{ ...rule, userId: 'u1' }]);
  });

  it('passes a user holding only one side', () => {
    expect(findConflicts('u1', new Set([PERMISSIONS.REVERSALS_CAPTURE]), [rule])).toEqual([]);
  });

  it('passes when there are no rules', () => {
    expect(
      findConflicts(
        'u1',
        new Set([PERMISSIONS.REVERSALS_CAPTURE, PERMISSIONS.REVERSALS_APPROVE]),
        [],
      ),
    ).toEqual([]);
  });
});

describe('normalisePair', () => {
  it('orders the pair so both directions collapse to one rule', () => {
    expect(normalisePair(PERMISSIONS.REVERSALS_CAPTURE, PERMISSIONS.REVERSALS_APPROVE)).toEqual(
      normalisePair(PERMISSIONS.REVERSALS_APPROVE, PERMISSIONS.REVERSALS_CAPTURE),
    );
  });
});
