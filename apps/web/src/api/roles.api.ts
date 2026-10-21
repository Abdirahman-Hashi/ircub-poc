import { apiFetch, apiFetchVoid } from '../lib/api';
import { HTTP } from '../lib/api.constants';

import { API_PATHS } from './api-paths.constants';

import type { PermissionCode, PermissionGroupView, RoleDetail } from './types';
import type { CreateRoleInput } from './types/admin.types';

export function listRoles(): Promise<RoleDetail[]> {
  return apiFetch<RoleDetail[]>(API_PATHS.ROLES);
}

export function createRole(input: CreateRoleInput): Promise<RoleDetail> {
  return apiFetch<RoleDetail>(API_PATHS.ROLES, { method: HTTP.METHOD_POST, body: input });
}

export function setRolePermissions(
  id: string,
  codes: readonly PermissionCode[],
): Promise<RoleDetail> {
  return apiFetch<RoleDetail>(`${API_PATHS.ROLES}/${id}/permissions`, {
    method: HTTP.METHOD_PUT,
    body: { codes },
  });
}

export function deleteRole(id: string): Promise<void> {
  return apiFetchVoid(`${API_PATHS.ROLES}/${id}`, { method: HTTP.METHOD_DELETE });
}

export function listPermissionGroups(): Promise<PermissionGroupView[]> {
  return apiFetch<PermissionGroupView[]>(API_PATHS.PERMISSIONS);
}
