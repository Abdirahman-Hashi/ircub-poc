import { apiFetch } from '../lib/api';
import { HTTP } from '../lib/api.constants';

import { API_PATHS } from './api-paths.constants';

import type { SystemConfigEntryView } from './types';

export function listConfig(): Promise<SystemConfigEntryView[]> {
  return apiFetch<SystemConfigEntryView[]>(API_PATHS.CONFIG);
}

export function updateConfig(key: string, value: unknown): Promise<SystemConfigEntryView> {
  return apiFetch<SystemConfigEntryView>(`${API_PATHS.CONFIG}/${key}`, {
    method: HTTP.METHOD_PUT,
    body: { value },
  });
}
