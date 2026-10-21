export interface TestSession {
  readonly accessToken: string;
  readonly refreshCookie: string;
  readonly userId: string;
}

export interface RoleLike {
  readonly id: string;
  readonly code: string;
}
