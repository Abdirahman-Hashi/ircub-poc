import { apiFetch, toQueryString } from '../lib/api';
import { HTTP } from '../lib/api.constants';

import { API_PATHS } from './api-paths.constants';

import type { CreatedUser, Paginated, UserSummary } from './types';
import type { CreateUserInput, UserListParams } from './types/admin.types';

export function listUsers(params: UserListParams): Promise<Paginated<UserSummary>> {
  return apiFetch<Paginated<UserSummary>>(`${API_PATHS.USERS}${toQueryString(params)}`);
}

export function createUser(input: CreateUserInput): Promise<CreatedUser> {
  return apiFetch<CreatedUser>(API_PATHS.USERS, { method: HTTP.METHOD_POST, body: input });
}

export function setUserRoles(id: string, roleIds: readonly string[]): Promise<UserSummary> {
  return apiFetch<UserSummary>(`${API_PATHS.USERS}/${id}/roles`, {
    method: HTTP.METHOD_PUT,
    body: { roleIds },
  });
}

export function deactivateUser(id: string): Promise<UserSummary> {
  return apiFetch<UserSummary>(`${API_PATHS.USERS}/${id}/deactivate`, { method: HTTP.METHOD_POST });
}

export function reactivateUser(id: string): Promise<UserSummary> {
  return apiFetch<UserSummary>(`${API_PATHS.USERS}/${id}/reactivate`, { method: HTTP.METHOD_POST });
}

export function resetUserPassword(id: string): Promise<{ temporaryPassword: string }> {
  return apiFetch<{ temporaryPassword: string }>(`${API_PATHS.USERS}/${id}/reset-password`, {
    method: HTTP.METHOD_POST,
  });
}
