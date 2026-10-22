import { SSE_EVENT } from './event-names';

import type { AppEvent, SseScope } from './sse.types';

/** Customers see only their own payment events; heartbeats go to everyone. */
export function isVisibleTo(event: AppEvent, scope: SseScope): boolean {
  if (scope.all || event.type === SSE_EVENT.HEARTBEAT) {
    return true;
  }
  if (
    event.type === SSE_EVENT.PAYMENT_UPDATED ||
    event.type === SSE_EVENT.PAYMENT_PERMANENTLY_FAILED
  ) {
    return scope.payerId !== null && event.data.payerId === scope.payerId;
  }
  return false;
}
