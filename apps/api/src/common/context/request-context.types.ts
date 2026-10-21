import type { PermissionCode } from '@ircub/shared';

/** Per-request values available anywhere via AsyncLocalStorage (standards §4). */
export interface RequestContext {
  readonly requestId: string;
  readonly ip: string | null;
  readonly userAgent: string | null;
  /** Set by the JWT strategy once the bearer token is validated. */
  actorId?: string;
  actorEmail?: string;
  /** Effective permissions resolved during this request, keyed by user id. */
  permissionCache?: Map<string, ReadonlySet<PermissionCode>>;
}
