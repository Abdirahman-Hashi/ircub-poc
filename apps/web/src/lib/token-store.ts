/**
 * Access token lives in memory only (never localStorage): a page reload re-acquires it via
 * the httpOnly refresh cookie. Phase 1 wires the setters from the auth flow.
 */
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}
