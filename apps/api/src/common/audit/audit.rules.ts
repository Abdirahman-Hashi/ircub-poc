import { createHash } from 'node:crypto';

import { AUDIT } from './audit.constants';

import type {
  AuditChainRow,
  AuditHashInput,
  ChainVerificationResult,
  EntityRecord,
} from './audit.types';

/**
 * Pure hash-chain functions (D8). No Prisma, no Nest: the same code verifies a chain in a
 * unit test, in `GET /audit/verify`, and in an offline script.
 */

/** JSON with keys sorted recursively so the same data always hashes the same. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value !== null && typeof value === 'object') {
    if (value instanceof Date) {
      return value.toISOString();
    }
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    return Object.fromEntries(entries.map(([key, inner]) => [key, sortKeys(inner)]));
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}

/** hash = sha256(prevHash || canonicalJson(row without hash)). */
export function computeAuditHash(input: AuditHashInput): string {
  const body = canonicalJson({
    seq: input.seq,
    actorId: input.actorId,
    actorEmail: input.actorEmail,
    entity: input.entity,
    entityId: input.entityId,
    action: input.action,
    before: input.before,
    after: input.after,
    ip: input.ip,
    userAgent: input.userAgent,
    createdAt: input.createdAt,
  });
  return createHash(AUDIT.HASH_ALGORITHM).update(input.prevHash).update(body).digest('hex');
}

/**
 * Walks rows in seq order, recomputing every hash and checking each prevHash points at the
 * previous row. Returns the first broken seq so an operator can bracket the tampering.
 */
export function verifyChain(rows: readonly AuditChainRow[]): ChainVerificationResult {
  let expectedPrev = AUDIT.GENESIS_HASH;
  let expectedSeq = BigInt(1);
  for (const row of rows) {
    const linked = row.prevHash === expectedPrev && row.seq === expectedSeq;
    const intact = linked && computeAuditHash(row) === row.hash;
    if (!intact) {
      return { ok: false, checked: rows.length, firstBrokenSeq: Number(row.seq) };
    }
    expectedPrev = row.hash;
    expectedSeq = row.seq + BigInt(1);
  }
  return { ok: true, checked: rows.length };
}

/** Replaces secret-bearing fields so hashes stay stable without storing secrets. */
export function redactRecord(record: EntityRecord, fields: readonly string[]): EntityRecord {
  if (fields.length === 0) {
    return record;
  }
  const copy: EntityRecord = { ...record };
  for (const field of fields) {
    if (field in copy && copy[field] !== null && copy[field] !== undefined) {
      copy[field] = AUDIT.REDACTED;
    }
  }
  return copy;
}

/** Entity id from `id`, or from the configured key fields joined with the separator. */
export function entityIdOf(record: EntityRecord, idFields: readonly string[] | undefined): string {
  if (idFields === undefined) {
    return String(record.id);
  }
  return idFields.map((field) => String(record[field])).join(AUDIT.COMPOSITE_ID_SEPARATOR);
}
