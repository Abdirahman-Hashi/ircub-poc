import type { TOKEN_PURPOSE } from './auth.constants';

export type TokenPurpose = (typeof TOKEN_PURPOSE)[keyof typeof TOKEN_PURPOSE];

/** Claims inside every JWT this API signs. */
export interface JwtPayload {
  readonly sub: string;
  readonly email: string;
  readonly purpose: TokenPurpose;
  readonly iat?: number;
  readonly exp?: number;
}

/** What the JWT strategy attaches to `request.user`. */
export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
}

export interface RequestWithUser {
  user?: AuthenticatedUser;
}
