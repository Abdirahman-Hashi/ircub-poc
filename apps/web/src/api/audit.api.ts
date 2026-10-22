import { apiFetch, toQueryString } from '../lib/api';

import { API_PATHS } from './api-paths.constants';

import type { AuditLogView, ChainVerifyResult, Paginated } from './types';
import type { AuditListParams } from './types/audit.types';

export const listAuditLog = (params: AuditListParams): Promise<Paginated<AuditLogView>> =>
  apiFetch(`${API_PATHS.AUDIT}${toQueryString(params)}`);
export const verifyAuditChain = (): Promise<ChainVerifyResult> => apiFetch(API_PATHS.AUDIT_VERIFY);
