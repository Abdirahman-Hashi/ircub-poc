import { apiFetch, apiFetchBlob, apiUpload, toQueryString } from '../lib/api';
import { HTTP } from '../lib/api.constants';

import { API_PATHS } from './api-paths.constants';

import type { Paginated, ReconciliationRunView } from './types';
import type {
  ChannelStatementView,
  ReconciliationRunDetail,
  ReconciliationRunParams,
  RunReconciliationInput,
} from './types/registry.types';

export const listReconciliationRuns = (
  params: ReconciliationRunParams,
): Promise<Paginated<ReconciliationRunView>> =>
  apiFetch(`${API_PATHS.RECONCILIATION_RUNS}${toQueryString(params)}`);
export const getReconciliationRun = (
  id: string,
  status: string,
): Promise<ReconciliationRunDetail> =>
  apiFetch(`${API_PATHS.RECONCILIATION_RUNS}/${id}${toQueryString({ status })}`);
export const runReconciliation = (input: RunReconciliationInput): Promise<ReconciliationRunView> =>
  apiFetch(API_PATHS.RECONCILIATION_RUNS, { method: HTTP.METHOD_POST, body: input });
export const exportReconciliationRun = (id: string): Promise<Blob> =>
  apiFetchBlob(`${API_PATHS.RECONCILIATION_RUNS}/${id}/${API_PATHS.RECONCILIATION_EXPORT}`);
export const listChannelStatements = (): Promise<ChannelStatementView[]> =>
  apiFetch(API_PATHS.RECONCILIATION_STATEMENTS);
export const uploadChannelStatement = (
  file: File,
  channel: string,
  date: string,
): Promise<ReconciliationRunView> => {
  const form = new FormData();
  form.append('file', file);
  form.append('channel', channel);
  form.append('date', date);
  return apiUpload(API_PATHS.RECONCILIATION_STATEMENTS, form);
};
