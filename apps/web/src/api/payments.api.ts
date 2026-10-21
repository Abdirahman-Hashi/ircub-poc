import { apiFetch, toQueryString } from '../lib/api';
import { HTTP } from '../lib/api.constants';

import { API_PATHS } from './api-paths.constants';

import type { ControlNumberLookup, Paginated, PaymentView } from './types';
import type { CapturePaymentInput, PaymentListParams } from './types/registry.types';

export const listPayments = (params: PaymentListParams): Promise<Paginated<PaymentView>> =>
  apiFetch(`${API_PATHS.PAYMENTS}${toQueryString(params)}`);
export const lookupControlNumber = (controlNumber: string): Promise<ControlNumberLookup> =>
  apiFetch(`${API_PATHS.PAYMENTS_LOOKUP}${toQueryString({ controlNumber })}`);
export const capturePayment = (input: CapturePaymentInput): Promise<PaymentView> =>
  apiFetch(API_PATHS.PAYMENTS_CAPTURE, { method: HTTP.METHOD_POST, body: input });
