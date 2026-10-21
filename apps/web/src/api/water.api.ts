import { apiFetch, apiFetchBlob, apiUpload, toQueryString } from '../lib/api';
import { HTTP } from '../lib/api.constants';

import { API_PATHS } from './api-paths.constants';

import type {
  BillingCycleView,
  BillView,
  CsvImportSummaryView,
  MeterReadingView,
  MeterView,
  NotificationView,
  Paginated,
  ReadingPreview,
  StatementView,
  TariffCategoryView,
  WaterAccountView,
} from './types';
import type {
  BillListParams,
  BillingCycleListParams,
  CreateWaterAccountInput,
  ReadingInput,
  ReadingListParams,
  ReplaceMeterInput,
  StatementParams,
  TariffInput,
  WaterAccountListParams,
} from './types/water.types';

const FILE_FIELD = 'file';

export const listTariffs = (includeInactive = true): Promise<TariffCategoryView[]> =>
  apiFetch(`${API_PATHS.TARIFFS}${toQueryString({ includeInactive })}`);
export const createTariff = (input: TariffInput): Promise<TariffCategoryView> =>
  apiFetch(API_PATHS.TARIFFS, { method: HTTP.METHOD_POST, body: input });
export const updateTariff = (
  id: string,
  input: Partial<Omit<TariffInput, 'code'>> & { active?: boolean },
): Promise<TariffCategoryView> =>
  apiFetch(`${API_PATHS.TARIFFS}/${id}`, { method: HTTP.METHOD_PATCH, body: input });

export const listWaterAccounts = (
  params: WaterAccountListParams,
): Promise<Paginated<WaterAccountView>> =>
  apiFetch(`${API_PATHS.WATER_ACCOUNTS}${toQueryString(params)}`);
export const getWaterAccount = (id: string): Promise<WaterAccountView> =>
  apiFetch(`${API_PATHS.WATER_ACCOUNTS}/${id}`);
export const createWaterAccount = (input: CreateWaterAccountInput): Promise<WaterAccountView> =>
  apiFetch(API_PATHS.WATER_ACCOUNTS, { method: HTTP.METHOD_POST, body: input });
export const getStatement = (accountId: string, params: StatementParams): Promise<StatementView> =>
  apiFetch(`${API_PATHS.WATER_ACCOUNTS}/${accountId}/statement${toQueryString(params)}`);
export const getStatementPdf = (accountId: string, params: StatementParams): Promise<Blob> =>
  apiFetchBlob(`${API_PATHS.WATER_ACCOUNTS}/${accountId}/statement.pdf${toQueryString(params)}`);

export const replaceMeter = (meterId: string, input: ReplaceMeterInput): Promise<MeterView> =>
  apiFetch(`${API_PATHS.METERS}/${meterId}/replace`, { method: HTTP.METHOD_POST, body: input });

export const listReadings = (params: ReadingListParams): Promise<Paginated<MeterReadingView>> =>
  apiFetch(`${API_PATHS.READINGS}${toQueryString(params)}`);
export const previewReading = (input: ReadingInput): Promise<ReadingPreview> =>
  apiFetch(API_PATHS.READINGS_PREVIEW, { method: HTTP.METHOD_POST, body: input });
export const createReading = (input: ReadingInput): Promise<MeterReadingView> =>
  apiFetch(API_PATHS.READINGS, { method: HTTP.METHOD_POST, body: input });
export function importMeterReadings(file: File, dryRun: boolean): Promise<CsvImportSummaryView> {
  const form = new FormData();
  form.append(FILE_FIELD, file, file.name);
  return apiUpload(`${API_PATHS.BULK_METER_READINGS}${toQueryString({ dryRun })}`, form);
}
export const downloadReadingsTemplate = (): Promise<Blob> =>
  apiFetchBlob(API_PATHS.BULK_METER_READINGS_TEMPLATE);

export const listBillingCycles = (
  params: BillingCycleListParams,
): Promise<Paginated<BillingCycleView>> =>
  apiFetch(`${API_PATHS.BILLING_CYCLES}${toQueryString(params)}`);
export const getBillingCycle = (id: string): Promise<BillingCycleView> =>
  apiFetch(`${API_PATHS.BILLING_CYCLES}/${id}`);
export const runBillingCycle = (period: string): Promise<BillingCycleView> =>
  apiFetch(API_PATHS.BILLING_CYCLES, { method: HTTP.METHOD_POST, body: { period } });
export const releaseBillingCycle = (id: string): Promise<BillingCycleView> =>
  apiFetch(`${API_PATHS.BILLING_CYCLES}/${id}/release`, { method: HTTP.METHOD_POST });

export const listBills = (params: BillListParams): Promise<Paginated<BillView>> =>
  apiFetch(`${API_PATHS.BILLS}${toQueryString(params)}`);
export const getBillPdf = (id: string): Promise<Blob> =>
  apiFetchBlob(`${API_PATHS.BILLS}/${id}/pdf`);
export const clearBillFlag = (id: string, note: string): Promise<BillView> =>
  apiFetch(`${API_PATHS.BILLS}/${id}/clear-flag`, { method: HTTP.METHOD_POST, body: { note } });
export const confirmBillFlag = (id: string, note: string): Promise<BillView> =>
  apiFetch(`${API_PATHS.BILLS}/${id}/confirm-flag`, { method: HTTP.METHOD_POST, body: { note } });

export const listNotifications = (params: {
  page: number;
  pageSize: number;
  relatedType?: string;
  relatedId?: string;
}): Promise<Paginated<NotificationView>> =>
  apiFetch(`${API_PATHS.NOTIFICATIONS}${toQueryString(params)}`);

export const getMyBillPdf = (id: string): Promise<Blob> =>
  apiFetchBlob(`${API_PATHS.ME_BILLS}/${id}/pdf`);
export const getMyStatement = (accountId: string): Promise<StatementView> =>
  apiFetch(`${API_PATHS.ME_WATER_ACCOUNTS}/${accountId}/statement`);
