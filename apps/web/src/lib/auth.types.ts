import type { PermissionCode } from '@ircub/shared';

import type { AuthUser, LoginResponse, RoleSummary } from '../api/types';

export type AuthStatus = 'loading' | 'anonymous' | 'authenticated';

export interface AuthContextValue {
  readonly status: AuthStatus;
  readonly user: AuthUser | null;
  readonly roles: readonly RoleSummary[];
  readonly permissions: ReadonlySet<PermissionCode>;
  readonly can: (code: PermissionCode) => boolean;
  readonly login: (email: string, password: string) => Promise<LoginResponse>;
  readonly verifyMfa: (challengeToken: string, code: string) => Promise<void>;
  readonly logout: () => Promise<void>;
  /** Re-fetch `/auth/me` after MFA or profile changes. */
  readonly reload: () => Promise<void>;
}
