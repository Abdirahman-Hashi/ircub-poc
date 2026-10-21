import { apiFetch, toQueryString } from '../lib/api';
import { HTTP } from '../lib/api.constants';

import { API_PATHS } from './api-paths.constants';

import type { RevenueTypeView } from './types';
import type { RevenueTypeInput } from './types/registry.types';

export const listRevenueTypes = (includeInactive = false): Promise<RevenueTypeView[]> =>
  apiFetch(`${API_PATHS.REVENUE_TYPES}${toQueryString({ includeInactive })}`);
export const createRevenueType = (input: RevenueTypeInput): Promise<RevenueTypeView> =>
  apiFetch(API_PATHS.REVENUE_TYPES, { method: HTTP.METHOD_POST, body: input });
export const updateRevenueType = (
  id: string,
  input: Partial<Omit<RevenueTypeInput, 'code'>> & { active?: boolean },
): Promise<RevenueTypeView> =>
  apiFetch(`${API_PATHS.REVENUE_TYPES}/${id}`, { method: HTTP.METHOD_PATCH, body: input });
export const removeRevenueType = (id: string): Promise<RevenueTypeView | null> =>
  apiFetch(`${API_PATHS.REVENUE_TYPES}/${id}`, { method: HTTP.METHOD_DELETE });
