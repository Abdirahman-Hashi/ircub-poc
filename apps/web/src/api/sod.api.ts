import { apiFetch, apiFetchVoid } from '../lib/api';
import { HTTP } from '../lib/api.constants';

import { API_PATHS } from './api-paths.constants';

import type { SodRuleView } from './types';
import type { CreateSodRuleInput } from './types/admin.types';

export function listSodRules(): Promise<SodRuleView[]> {
  return apiFetch<SodRuleView[]>(API_PATHS.SOD_RULES);
}

export function createSodRule(input: CreateSodRuleInput): Promise<SodRuleView> {
  return apiFetch<SodRuleView>(API_PATHS.SOD_RULES, { method: HTTP.METHOD_POST, body: input });
}

export function deleteSodRule(id: string): Promise<void> {
  return apiFetchVoid(`${API_PATHS.SOD_RULES}/${id}`, { method: HTTP.METHOD_DELETE });
}
