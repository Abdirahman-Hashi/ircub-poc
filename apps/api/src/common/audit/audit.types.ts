import type { AuditAction } from '@ircub/shared';

import type { Prisma } from '@prisma/client';

/** Mutating Prisma operations the extension intercepts. */
export type AuditedOperation =
  'create' | 'update' | 'delete' | 'upsert' | 'createMany' | 'updateMany' | 'deleteMany';

export interface AuditedModelConfig {
  /** Fields whose values are replaced with AUDIT.REDACTED in before/after snapshots. */
  readonly redact?: readonly string[];
  /** Fields forming the entity id when the model has no `id` column (composite keys). */
  readonly idFields?: readonly string[];
}

export type AuditedModelMap = Readonly<Partial<Record<Prisma.ModelName, AuditedModelConfig>>>;

export interface AuditActor {
  readonly actorId: string | null;
  readonly actorEmail: string;
  readonly ip: string | null;
  readonly userAgent: string | null;
}

/** What a mutation contributes to the log before hashing. */
export interface AuditEntryInput {
  readonly entity: string;
  readonly entityId: string;
  readonly action: AuditAction;
  readonly before: Prisma.JsonValue | null;
  readonly after: Prisma.JsonValue | null;
}

/** Everything that participates in the hash, in the canonical order. */
export interface AuditHashInput extends AuditEntryInput, AuditActor {
  readonly seq: bigint;
  readonly createdAt: Date;
  readonly prevHash: string;
}

export interface AuditChainRow extends AuditHashInput {
  readonly hash: string;
}

export interface ChainVerificationResult {
  readonly ok: boolean;
  readonly checked: number;
  /** First sequence whose hash or link is wrong, or the first sequence missing from a truncated tail. */
  readonly firstBrokenSeq?: number;
  /** Sequence the chain head says exists; differs from `checked` when rows were removed. */
  readonly headSeq?: number;
}

export type EntityRecord = Record<string, unknown>;

export interface ChainHeadRow {
  readonly lastSeq: bigint;
  readonly lastHash: string;
}

/** Minimal shape of a Prisma model delegate used to read before/after snapshots. */
export interface SnapshotDelegate {
  findUnique(args: { where: unknown }): Promise<EntityRecord | null>;
  findMany(args: { where: unknown }): Promise<EntityRecord[]>;
}

export interface MutationArgs {
  readonly where?: unknown;
  readonly data?: unknown;
}
