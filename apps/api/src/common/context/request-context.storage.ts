import { AsyncLocalStorage } from 'node:async_hooks';

import type { RequestContext } from './request-context.types';

/**
 * Carries the request id (and later the actor) across async boundaries so services, the
 * audit extension and the exception filter can log it without threading it through
 * every signature.
 */
export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

export function getRequestId(): string | undefined {
  return requestContextStorage.getStore()?.requestId;
}
