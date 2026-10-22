import type { SseEnvelope } from '@ircub/shared';

import type { SSE_EVENT } from './event-names';
import type { AppEventPayloads } from './event-payloads';

export type SseEventName = (typeof SSE_EVENT)[keyof typeof SSE_EVENT];

/** Who the subscriber is allowed to see events for. */
export interface SseScope {
  readonly all: boolean;
  readonly payerId: string | null;
}

/** Discriminated union of everything the EventBus can carry. */
export type AppEvent = {
  [K in SseEventName]: SseEnvelope<K, AppEventPayloads[K]>;
}[SseEventName];
