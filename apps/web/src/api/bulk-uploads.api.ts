import { apiFetch, apiFetchBlob, apiUpload, toQueryString } from '../lib/api';

import { API_PATHS } from './api-paths.constants';

import type { BulkUploadView, CsvImportSummaryView, Paginated } from './types';
import type { PageParams } from './types/registry.types';

const FILE_FIELD = 'file';

export function importRevenueTransactions(
  file: File,
  dryRun: boolean,
): Promise<CsvImportSummaryView> {
  const form = new FormData();
  form.append(FILE_FIELD, file, file.name);
  return apiUpload(`${API_PATHS.BULK_REVENUE_TRANSACTIONS}${toQueryString({ dryRun })}`, form);
}
export const listBulkUploads = (params: PageParams): Promise<Paginated<BulkUploadView>> =>
  apiFetch(`${API_PATHS.BULK_UPLOADS}${toQueryString(params)}`);
export const getBulkUpload = (id: string): Promise<BulkUploadView> =>
  apiFetch(`${API_PATHS.BULK_UPLOADS}/${id}`);
export const downloadTemplate = (): Promise<Blob> => apiFetchBlob(API_PATHS.BULK_TEMPLATE);
