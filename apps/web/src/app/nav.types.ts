import type { PermissionCode } from '@ircub/shared';

import type { StaticRoutePath } from './routes.constants';
import type { Icon } from '@tabler/icons-react';

export interface NavItem {
  readonly label: string;
  readonly to: StaticRoutePath;
  readonly icon: Icon;
  /** Shown only when the user holds this permission; the server still enforces it. */
  readonly permission: PermissionCode;
}

export type CanFn = (code: PermissionCode) => boolean;
