import type { PermissionCode } from '@ircub/shared';

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly permissions: readonly PermissionCode[];
}

export interface AuthContextValue {
  readonly user: AuthUser | null;
  readonly isAuthenticated: boolean;
  readonly can: (code: PermissionCode) => boolean;
  readonly logout: () => Promise<void>;
}
