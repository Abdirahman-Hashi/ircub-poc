export interface ApiRequestInit extends Omit<RequestInit, 'body'> {
  readonly body?: unknown;
  /** Do not attach the bearer token (health, login). */
  readonly skipAuth?: boolean;
  /** Do not attempt a refresh-and-retry on 401 (the refresh call itself, health). */
  readonly skipRefresh?: boolean;
}

export interface RefreshResponse {
  readonly accessToken: string;
}
