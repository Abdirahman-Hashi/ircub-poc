import type { AuditAction } from '../enums';

/** One row of the tamper-evident audit log (D8), as served by `GET /audit`. */
export interface AuditLogView {
  readonly seq: string;
  readonly actorId: string | null;
  readonly actorEmail: string;
  readonly entity: string;
  readonly entityId: string;
  readonly action: AuditAction;
  readonly before: unknown;
  readonly after: unknown;
  readonly ip: string | null;
  readonly userAgent: string | null;
  readonly createdAt: Date | string;
  readonly hash: string;
  readonly prevHash: string;
}

/** Result of `GET /audit/verify`: the chain recomputed from genesis and compared with its head. */
export interface ChainVerifyResult {
  readonly ok: boolean;
  readonly checked: number;
  readonly firstBrokenSeq?: number;
  readonly headSeq?: number;
}
