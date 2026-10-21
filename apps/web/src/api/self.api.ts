import { apiFetch } from '../lib/api';

import { API_PATHS } from './api-paths.constants';

import type { PayerProfile } from './types';

export const getMyProfile = (): Promise<PayerProfile> => apiFetch(API_PATHS.ME);
