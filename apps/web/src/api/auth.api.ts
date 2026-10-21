import { apiFetch, apiFetchVoid } from '../lib/api';
import { HTTP } from '../lib/api.constants';

import { API_PATHS } from './api-paths.constants';

import type { LoginResponse, MeResponse, MfaEnrolResponse, SessionResponse } from './types';
import type { ChangePasswordInput } from './types/admin.types';

export function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>(API_PATHS.AUTH_LOGIN, {
    method: HTTP.METHOD_POST,
    body: { email, password },
    skipAuth: true,
    skipRefresh: true,
  });
}

export function verifyMfa(challengeToken: string, code: string): Promise<SessionResponse> {
  return apiFetch<SessionResponse>(API_PATHS.AUTH_MFA_VERIFY, {
    method: HTTP.METHOD_POST,
    body: { challengeToken, code },
    skipAuth: true,
    skipRefresh: true,
  });
}

export function refreshSession(): Promise<SessionResponse> {
  return apiFetch<SessionResponse>(API_PATHS.AUTH_REFRESH, {
    method: HTTP.METHOD_POST,
    skipAuth: true,
    skipRefresh: true,
  });
}

export function logout(): Promise<void> {
  return apiFetchVoid(API_PATHS.AUTH_LOGOUT, { method: HTTP.METHOD_POST, skipRefresh: true });
}

export function getMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>(API_PATHS.AUTH_ME);
}

export function enrolMfa(): Promise<MfaEnrolResponse> {
  return apiFetch<MfaEnrolResponse>(API_PATHS.AUTH_MFA_ENROL, { method: HTTP.METHOD_POST });
}

export function confirmMfa(code: string): Promise<void> {
  return apiFetchVoid(API_PATHS.AUTH_MFA_CONFIRM, { method: HTTP.METHOD_POST, body: { code } });
}

export function disableMfa(password: string): Promise<void> {
  return apiFetchVoid(API_PATHS.AUTH_MFA_DISABLE, { method: HTTP.METHOD_POST, body: { password } });
}

export function changePassword(input: ChangePasswordInput): Promise<void> {
  return apiFetchVoid(API_PATHS.AUTH_CHANGE_PASSWORD, { method: HTTP.METHOD_POST, body: input });
}
