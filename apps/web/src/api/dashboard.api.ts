import { apiFetch, apiFetchBlob, apiFetchVoid, apiUpload, toQueryString } from '../lib/api';
import { HTTP } from '../lib/api.constants';

import { API_PATHS } from './api-paths.constants';

import type {
  AlertView,
  CsvImportSummaryView,
  DashboardOverview,
  EfficiencyRow,
  ForecastResponse,
  Paginated,
  RevenueTargetView,
  TargetAttainmentRow,
  TrendsResponse,
} from './types';
import type {
  AlertListParams,
  ForecastParams,
  TrendsParams,
  UpsertTargetInput,
} from './types/registry.types';

export const getOverview = (from: string, to: string): Promise<DashboardOverview> =>
  apiFetch(`${API_PATHS.DASHBOARD_OVERVIEW}${toQueryString({ from, to })}`);
export const getTrends = (params: TrendsParams): Promise<TrendsResponse> =>
  apiFetch(`${API_PATHS.DASHBOARD_TRENDS}${toQueryString(params)}`);
export const getTargetAttainment = (from: string, to: string): Promise<TargetAttainmentRow[]> =>
  apiFetch(`${API_PATHS.DASHBOARD_TARGETS}${toQueryString({ from, to })}`);
export const getEfficiency = (from: string, to: string): Promise<EfficiencyRow[]> =>
  apiFetch(`${API_PATHS.DASHBOARD_EFFICIENCY}${toQueryString({ from, to })}`);
export const getForecast = (params: ForecastParams): Promise<ForecastResponse> =>
  apiFetch(`${API_PATHS.DASHBOARD_FORECAST}${toQueryString(params)}`);

export const listAlerts = (params: AlertListParams): Promise<Paginated<AlertView>> =>
  apiFetch(`${API_PATHS.ALERTS}${toQueryString(params)}`);
export const unacknowledgedAlertCount = (): Promise<{ count: number }> =>
  apiFetch(API_PATHS.ALERTS_UNACKNOWLEDGED);
export const acknowledgeAlert = (id: string): Promise<AlertView> =>
  apiFetch(`${API_PATHS.ALERTS}/${id}/${API_PATHS.ALERTS_ACK}`, { method: HTTP.METHOD_POST });
export const evaluateAlerts = (): Promise<AlertView[]> =>
  apiFetch(API_PATHS.ALERTS_EVALUATE, { method: HTTP.METHOD_POST });

export const listTargets = (from: string, to: string): Promise<RevenueTargetView[]> =>
  apiFetch(`${API_PATHS.TARGETS}${toQueryString({ from, to })}`);
export const upsertTarget = (input: UpsertTargetInput): Promise<RevenueTargetView> =>
  apiFetch(API_PATHS.TARGETS, { method: HTTP.METHOD_PUT, body: input });
export const deleteTarget = (id: string): Promise<void> =>
  apiFetchVoid(`${API_PATHS.TARGETS}/${id}`, { method: HTTP.METHOD_DELETE });
export const targetsTemplate = (): Promise<Blob> => apiFetchBlob(API_PATHS.TARGETS_TEMPLATE);
export const importTargets = (file: File, dryRun: boolean): Promise<CsvImportSummaryView> => {
  const form = new FormData();
  form.append('file', file);
  return apiUpload(`${API_PATHS.TARGETS_IMPORT}${toQueryString({ dryRun })}`, form);
};
