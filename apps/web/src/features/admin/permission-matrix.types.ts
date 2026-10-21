import type { PermissionCode } from '@ircub/shared';

export type MatrixCellState = 'direct' | 'inherited' | 'none';

export interface MatrixCell {
  readonly code: PermissionCode;
  readonly state: MatrixCellState;
}
