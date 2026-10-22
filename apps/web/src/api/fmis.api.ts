import { apiFetch, apiFetchBlob, apiFetchVoid, toQueryString } from '../lib/api';
import { HTTP } from '../lib/api.constants';

import { API_PATHS } from './api-paths.constants';

import type {
  FmisReconciliationDrilldown,
  FmisReconciliationRow,
  GlMappingView,
  JournalBatchDetail,
  JournalBatchView,
  JournalLineView,
  Paginated,
} from './types';
import type { CreateGlMappingInput, JournalBatchParams } from './types/registry.types';

export const listGlMappings = (): Promise<GlMappingView[]> => apiFetch(API_PATHS.FMIS_MAPPINGS);
export const createGlMapping = (input: CreateGlMappingInput): Promise<GlMappingView> =>
  apiFetch(API_PATHS.FMIS_MAPPINGS, { method: HTTP.METHOD_POST, body: input });
export const deleteGlMapping = (id: string): Promise<void> =>
  apiFetchVoid(`${API_PATHS.FMIS_MAPPINGS}/${id}`, { method: HTTP.METHOD_DELETE });

export const listJournalBatches = (
  params: JournalBatchParams,
): Promise<Paginated<JournalBatchView>> =>
  apiFetch(`${API_PATHS.FMIS_BATCHES}${toQueryString(params)}`);
export const getJournalBatch = (id: string): Promise<JournalBatchDetail> =>
  apiFetch(`${API_PATHS.FMIS_BATCHES}/${id}`);
export const buildJournalBatch = (
  date: string,
  forceFailure: boolean,
): Promise<JournalBatchView | null> =>
  apiFetch(API_PATHS.FMIS_BUILD, { method: HTTP.METHOD_POST, body: { date, forceFailure } });
export const retryJournalBatch = (id: string): Promise<JournalBatchView> =>
  apiFetch(`${API_PATHS.FMIS_BATCHES}/${id}/${API_PATHS.FMIS_RETRY}`, { method: HTTP.METHOD_POST });
export const listJournalLines = (paymentId: string): Promise<JournalLineView[]> =>
  apiFetch(`${API_PATHS.FMIS_LINES}${toQueryString({ paymentId })}`);

export const getFmisReconciliation = (from: string, to: string): Promise<FmisReconciliationRow[]> =>
  apiFetch(`${API_PATHS.FMIS_RECONCILIATION}${toQueryString({ from, to })}`);
export const getFmisDrilldown = (
  date: string,
  glCode: string,
): Promise<FmisReconciliationDrilldown> =>
  apiFetch(`${API_PATHS.FMIS_RECONCILIATION}/${date}/${glCode}`);
export const exportFmisReconciliation = (from: string, to: string): Promise<Blob> =>
  apiFetchBlob(`${API_PATHS.FMIS_RECONCILIATION_EXPORT}${toQueryString({ from, to })}`);
