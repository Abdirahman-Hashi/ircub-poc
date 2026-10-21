import { apiFetch, toQueryString } from '../lib/api';
import { HTTP } from '../lib/api.constants';

import { API_PATHS } from './api-paths.constants';

import type { Paginated, ReversalView } from './types';
import type { ReversalListParams } from './types/registry.types';

export const listReversals = (params: ReversalListParams): Promise<Paginated<ReversalView>> =>
  apiFetch(`${API_PATHS.REVERSALS}${toQueryString(params)}`);
export const createReversal = (paymentId: string, reason: string): Promise<ReversalView> =>
  apiFetch(API_PATHS.REVERSALS, { method: HTTP.METHOD_POST, body: { paymentId, reason } });
export const approveReversal = (id: string, note?: string): Promise<ReversalView> =>
  apiFetch(`${API_PATHS.REVERSALS}/${id}/approve`, {
    method: HTTP.METHOD_POST,
    body: { ...(note === undefined ? {} : { note }) },
  });
export const rejectReversal = (id: string, note?: string): Promise<ReversalView> =>
  apiFetch(`${API_PATHS.REVERSALS}/${id}/reject`, {
    method: HTTP.METHOD_POST,
    body: { ...(note === undefined ? {} : { note }) },
  });
