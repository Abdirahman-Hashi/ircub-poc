import type { DuplicateFlagStatus } from '@ircub/shared';

import { apiFetch, toQueryString } from '../lib/api';
import { HTTP } from '../lib/api.constants';

import { API_PATHS } from './api-paths.constants';

import type {
  DuplicateFlagView,
  Paginated,
  PayerProfile,
  PayerView,
  RegisteredPayer,
} from './types';
import type {
  CreatePayerInput,
  DuplicateListParams,
  PayerListParams,
} from './types/registry.types';

export const listPayers = (params: PayerListParams): Promise<Paginated<PayerView>> =>
  apiFetch(`${API_PATHS.PAYERS}${toQueryString(params)}`);
export const getPayerProfile = (id: string): Promise<PayerProfile> =>
  apiFetch(`${API_PATHS.PAYERS}/${id}`);
export const createPayer = (input: CreatePayerInput): Promise<RegisteredPayer> =>
  apiFetch(API_PATHS.PAYERS, { method: HTTP.METHOD_POST, body: input });
export const updatePayer = (
  id: string,
  input: Partial<CreatePayerInput>,
): Promise<RegisteredPayer> =>
  apiFetch(`${API_PATHS.PAYERS}/${id}`, { method: HTTP.METHOD_PATCH, body: input });
export const suspendPayer = (id: string): Promise<PayerView> =>
  apiFetch(`${API_PATHS.PAYERS}/${id}/suspend`, { method: HTTP.METHOD_POST });
export const reactivatePayer = (id: string): Promise<PayerView> =>
  apiFetch(`${API_PATHS.PAYERS}/${id}/reactivate`, { method: HTTP.METHOD_POST });
export const listDuplicates = (
  params: DuplicateListParams,
): Promise<Paginated<DuplicateFlagView>> =>
  apiFetch(`${API_PATHS.PAYER_DUPLICATES}${toQueryString(params)}`);
export const reviewDuplicate = (
  id: string,
  status: DuplicateFlagStatus,
  note?: string,
): Promise<DuplicateFlagView> =>
  apiFetch(`${API_PATHS.PAYER_DUPLICATES}/${id}/review`, {
    method: HTTP.METHOD_POST,
    body: { status, ...(note === undefined ? {} : { note }) },
  });
