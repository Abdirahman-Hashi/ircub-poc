import type { HealthResponse } from '@ircub/shared';

import type { StoreSnapshot } from '../store/store.types';

export interface MocksHealthResponse extends HealthResponse {
  readonly store: StoreSnapshot;
}
