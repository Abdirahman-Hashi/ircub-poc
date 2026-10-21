import type { PermissionCode } from '@ircub/shared';

import type { MatrixCell, MatrixCellState } from './permission-matrix.types';

/**
 * State of one checkbox in the permission matrix. Inherited permissions are shown ticked
 * and disabled: they come from the parent role and can only be changed there.
 */
export function cellState(
  code: PermissionCode,
  direct: ReadonlySet<PermissionCode>,
  inherited: ReadonlySet<PermissionCode>,
): MatrixCellState {
  if (inherited.has(code)) {
    return 'inherited';
  }
  return direct.has(code) ? 'direct' : 'none';
}

export function buildMatrixRow(
  codes: readonly PermissionCode[],
  direct: ReadonlySet<PermissionCode>,
  inherited: ReadonlySet<PermissionCode>,
): MatrixCell[] {
  return codes.map((code) => ({ code, state: cellState(code, direct, inherited) }));
}

/** Toggling an inherited cell is a no-op; toggling a direct/none cell flips membership. */
export function toggleDirect(
  code: PermissionCode,
  direct: ReadonlySet<PermissionCode>,
  inherited: ReadonlySet<PermissionCode>,
): ReadonlySet<PermissionCode> {
  if (inherited.has(code)) {
    return direct;
  }
  const next = new Set(direct);
  if (next.has(code)) {
    next.delete(code);
  } else {
    next.add(code);
  }
  return next;
}
