import type { PASSWORD_VIOLATION } from './auth.constants';
import type { LoginResponseDto } from './dto/login.response.dto';
import type { SessionResponseDto } from './dto/session.response.dto';

export type PasswordViolation = (typeof PASSWORD_VIOLATION)[keyof typeof PASSWORD_VIOLATION];

export interface PasswordPolicy {
  readonly minLength: number;
}

export interface LockoutPolicy {
  readonly maxFailedAttempts: number;
  readonly lockoutMinutes: number;
}

export interface LockState {
  readonly failedLoginCount: number;
  readonly lockedUntil: Date | null;
}

/** Plain token plus the hash that is persisted. */
export interface IssuedRefreshToken {
  readonly token: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
}

export interface RefreshCookieOptions {
  readonly httpOnly: true;
  readonly secure: boolean;
  readonly sameSite: 'lax';
  readonly path: string;
  readonly maxAge: number;
}

export type RandomInt = (maxExclusive: number) => number;

/** Service → controller: response body plus the refresh token the controller sets as a cookie. */
export interface SessionOutcome {
  readonly body: SessionResponseDto;
  readonly refreshToken: IssuedRefreshToken;
}

export interface LoginOutcome {
  readonly body: LoginResponseDto;
  readonly refreshToken?: IssuedRefreshToken;
}
