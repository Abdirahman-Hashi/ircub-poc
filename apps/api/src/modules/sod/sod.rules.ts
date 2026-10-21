import type { PermissionCode } from '@ircub/shared';

import type { SodConflict, SodRulePair } from './sod.types';

/** Rules are stored with codes in sorted order so (A,B) and (B,A) are the same rule. */
export function normalisePair(
  a: PermissionCode,
  b: PermissionCode,
): readonly [PermissionCode, PermissionCode] {
  return a < b ? [a, b] : [b, a];
}

/** Every rule whose both sides appear in one user's effective permissions (D7). */
export function findConflicts(
  userId: string,
  held: ReadonlySet<PermissionCode>,
  rules: readonly SodRulePair[],
): SodConflict[] {
  return rules
    .filter((rule) => held.has(rule.permissionACode) && held.has(rule.permissionBCode))
    .map((rule) => ({ ...rule, userId }));
}
