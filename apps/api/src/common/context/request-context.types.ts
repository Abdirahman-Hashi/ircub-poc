/** Per-request values available anywhere via AsyncLocalStorage (standards §4). */
export interface RequestContext {
  readonly requestId: string;
  /** Set by the auth guard in phase 1. */
  actorId?: string;
  actorEmail?: string;
}
