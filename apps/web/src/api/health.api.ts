import { apiFetch } from '../lib/api';

import { API_PATHS } from './api-paths.constants';

import type { HealthResponse } from './types';

export function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>(API_PATHS.HEALTH, { skipAuth: true, skipRefresh: true });
}
