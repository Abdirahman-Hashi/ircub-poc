import type { CheckStatus, HealthStatus } from '../constants/api.constants';

export interface HealthCheck {
  readonly status: CheckStatus;
  readonly latencyMs?: number;
  readonly error?: string;
}

/** Response of `GET /health` (liveness) and `GET /ready` (readiness). */
export interface HealthResponse {
  readonly status: HealthStatus;
  readonly checks: Readonly<Record<string, HealthCheck>>;
  readonly version: string;
  readonly timestamp: string;
}
