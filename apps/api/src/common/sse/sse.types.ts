import type { SseEnvelope } from '@ircub/shared';

import type { SSE_EVENT } from './event-names';
import type { AppEventPayloads } from './event-payloads';

export type SseEventName = (typeof SSE_EVENT)[keyof typeof SSE_EVENT];

/** Discriminated union of everything the EventBus can carry. */
export type AppEvent = {
  [K in SseEventName]: SseEnvelope<K, AppEventPayloads[K]>;
}[SseEventName];
