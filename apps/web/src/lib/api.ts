import { ErrorCode } from '@ircub/shared';

import { API_PATHS } from '../api/api-paths.constants';

import { ApiError } from './api-error';
import { HTTP } from './api.constants';
import { ENV } from './env.constants';
import { getAccessToken, setAccessToken } from './token-store';

import type { ApiRequestInit, RefreshResponse } from './api.types';
import type { ErrorResponse } from '../api/types';

/**
 * The only place the web talks HTTP (standards §9). Adds the bearer token, parses the
 * error contract into `ApiError`, and on 401 refreshes the access token once and retries.
 */
export async function apiFetch<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const response = await send(path, init);

  if (response.status === HTTP.UNAUTHORIZED && init.skipRefresh !== true) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetch<T>(path, { ...init, skipRefresh: true });
    }
  }

  if (!response.ok) {
    throw new ApiError(await parseError(response));
  }

  if (response.status === HTTP.NO_CONTENT) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

/** For endpoints that answer 204 No Content. */
export async function apiFetchVoid(path: string, init: ApiRequestInit = {}): Promise<void> {
  await apiFetch<undefined>(path, init);
}

async function send(path: string, init: ApiRequestInit): Promise<Response> {
  const { body, skipAuth: _skipAuth, skipRefresh: _skipRefresh, headers, ...rest } = init;
  const requestHeaders = new Headers(headers);
  const token = getAccessToken();

  if (init.skipAuth !== true && token !== null) {
    requestHeaders.set(HTTP.HEADER_AUTHORIZATION, `${HTTP.BEARER_PREFIX}${token}`);
  }
  if (body !== undefined) {
    requestHeaders.set(HTTP.HEADER_CONTENT_TYPE, HTTP.CONTENT_TYPE_JSON);
  }

  return fetch(`${ENV.API_URL}${path}`, {
    ...rest,
    headers: requestHeaders,
    credentials: 'include',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const result = await apiFetch<RefreshResponse>(API_PATHS.AUTH_REFRESH, {
      method: HTTP.METHOD_POST,
      skipAuth: true,
      skipRefresh: true,
    });
    setAccessToken(result.accessToken);
    return true;
  } catch {
    setAccessToken(null);
    return false;
  }
}

async function parseError(response: Response): Promise<ErrorResponse> {
  try {
    return (await response.json()) as ErrorResponse;
  } catch {
    return {
      statusCode: response.status,
      code: ErrorCode.INTERNAL_ERROR,
      message: response.statusText,
    };
  }
}

/** Builds `?a=1&b=x` from an object, skipping undefined/empty values. */
export function toQueryString(params: object): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (typeof value === 'string' && value.length > 0) {
      query.set(key, value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      query.set(key, String(value));
    }
  }
  const text = query.toString();
  return text.length > 0 ? `?${text}` : '';
}
