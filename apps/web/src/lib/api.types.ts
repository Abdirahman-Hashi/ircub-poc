export interface ApiRequestInit extends Omit<RequestInit, 'body'> {
  readonly body?: unknown;
  /** Pre-encoded body (FormData); sent without a JSON content type. */
  readonly rawBody?: BodyInit;
  /** Do not attach the bearer token (health, login). */
  readonly skipAuth?: boolean;
  /** Do not attempt a refresh-and-retry on 401 (the refresh call itself, health). */
  readonly skipRefresh?: boolean;
}

export interface RefreshResponse {
  readonly accessToken: string;
}
