import type { PermissionCode } from '../permissions';

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly mfaEnabled: boolean;
  /** Password older than the configured maximum age (warn only, D5). */
  readonly passwordChangeRecommended: boolean;
}

export interface RoleSummary {
  readonly id: string;
  readonly code: string;
  readonly name: string;
}

/** `POST /auth/login`: either an MFA challenge or a full session. */
export interface LoginResponse {
  readonly mfaRequired: boolean;
  readonly challengeToken?: string;
  readonly accessToken?: string;
  readonly user?: AuthUser;
  readonly permissions?: readonly PermissionCode[];
}

/** `POST /auth/mfa/verify`, `POST /auth/refresh`. */
export interface SessionResponse {
  readonly accessToken: string;
  readonly user: AuthUser;
  readonly permissions: readonly PermissionCode[];
}

/** `GET /auth/me`. */
export interface MeResponse {
  readonly user: AuthUser;
  readonly roles: readonly RoleSummary[];
  readonly permissions: readonly PermissionCode[];
}

export interface MfaEnrolResponse {
  readonly otpauthUrl: string;
  readonly secret: string;
}
