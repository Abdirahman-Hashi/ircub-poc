import { apiFetch } from '../lib/api';
import { HTTP } from '../lib/api.constants';

import { API_PATHS } from './api-paths.constants';

import type { FxRateView } from './types';

export const getLatestRate = (): Promise<FxRateView> => apiFetch(API_PATHS.FX_LATEST);
export const refreshRate = (): Promise<FxRateView> =>
  apiFetch(API_PATHS.FX_REFRESH, { method: HTTP.METHOD_POST });
export const getRateHistory = (): Promise<FxRateView[]> => apiFetch(API_PATHS.FX_HISTORY);
