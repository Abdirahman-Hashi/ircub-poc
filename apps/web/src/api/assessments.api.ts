import { apiFetch, apiFetchBlob, toQueryString } from '../lib/api';
import { HTTP } from '../lib/api.constants';

import { API_PATHS } from './api-paths.constants';

import type { AssessmentDetail, AssessmentView, Paginated } from './types';
import type { AssessmentListParams, CreateAssessmentInput } from './types/registry.types';

export const listAssessments = (params: AssessmentListParams): Promise<Paginated<AssessmentView>> =>
  apiFetch(`${API_PATHS.ASSESSMENTS}${toQueryString(params)}`);
export const getAssessment = (id: string): Promise<AssessmentDetail> =>
  apiFetch(`${API_PATHS.ASSESSMENTS}/${id}`);
export const createAssessment = (input: CreateAssessmentInput): Promise<AssessmentView> =>
  apiFetch(API_PATHS.ASSESSMENTS, { method: HTTP.METHOD_POST, body: input });
export const cancelAssessment = (id: string): Promise<AssessmentView> =>
  apiFetch(`${API_PATHS.ASSESSMENTS}/${id}/cancel`, { method: HTTP.METHOD_POST });
export const exportAssessmentsCsv = (
  params: Omit<AssessmentListParams, 'page' | 'pageSize'>,
): Promise<Blob> => apiFetchBlob(`${API_PATHS.ASSESSMENTS_EXPORT}${toQueryString(params)}`);
