import { Prisma, type PrismaClient } from '@prisma/client';

import { AuditAction } from '@ircub/shared';

import { AUDITED_MODELS } from './audit.config';
import { entityIdOf, redactRecord } from './audit.rules';
import { AuditWriter } from './audit.writer';

import type {
  AuditedModelConfig,
  AuditedOperation,
  EntityRecord,
  MutationArgs,
  SnapshotDelegate,
} from './audit.types';

const AUDITED_OPERATIONS: readonly AuditedOperation[] = [
  'create',
  'update',
  'delete',
  'upsert',
  'createMany',
  'updateMany',
  'deleteMany',
];

function isAuditedOperation(operation: string): operation is AuditedOperation {
  return (AUDITED_OPERATIONS as readonly string[]).includes(operation);
}

function delegateFor(base: PrismaClient, model: string): SnapshotDelegate {
  const key = model.charAt(0).toLowerCase() + model.slice(1);
  const delegate = (base as unknown as Record<string, SnapshotDelegate | undefined>)[key];
  if (delegate === undefined) {
    throw new Error(`audit: no delegate for model ${model}`);
  }
  return delegate;
}

function toJson(record: EntityRecord | null, config: AuditedModelConfig): Prisma.JsonValue | null {
  if (record === null) {
    return null;
  }
  // Dates and BigInts are not JSON; round-trip through canonical serialisation.
  return JSON.parse(
    JSON.stringify(redactRecord(record, config.redact ?? []), (_key, value: unknown) =>
      typeof value === 'bigint' ? value.toString() : value,
    ),
  ) as Prisma.JsonValue;
}

/**
 * Prisma client extension that audits every mutation of a model listed in
 * `AUDITED_MODELS`: loads the `before` snapshot where one exists, runs the operation, then
 * appends a chained audit row with the `after` snapshot and the current actor.
 *
 * Trade-off (documented): the audit row is written right after the mutation in its own
 * transaction. If a caller wraps several mutations in an interactive transaction that later
 * rolls back, their audit rows remain — acceptable for the POC; a production system would
 * hold audit rows in the same transaction via a transactional outbox.
 */
export function createAuditExtension(base: PrismaClient, writer: AuditWriter) {
  return Prisma.defineExtension({
    name: 'audit',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const config = AUDITED_MODELS[model];
          if (config === undefined || !isAuditedOperation(operation)) {
            return query(args);
          }
          const delegate = delegateFor(base, model);
          const mutation = args as MutationArgs;

          switch (operation) {
            case 'create': {
              const result = (await query(args)) as EntityRecord;
              await writer.append({
                entity: model,
                entityId: entityIdOf(result, config.idFields),
                action: AuditAction.CREATE,
                before: null,
                after: toJson(result, config),
              });
              return result;
            }
            case 'update':
            case 'upsert': {
              const before = await delegate.findUnique({ where: mutation.where });
              const result = (await query(args)) as EntityRecord;
              await writer.append({
                entity: model,
                entityId: entityIdOf(result, config.idFields),
                action: before === null ? AuditAction.CREATE : AuditAction.UPDATE,
                before: toJson(before, config),
                after: toJson(result, config),
              });
              return result;
            }
            case 'delete': {
              const before = await delegate.findUnique({ where: mutation.where });
              const result = (await query(args)) as EntityRecord;
              await writer.append({
                entity: model,
                entityId: entityIdOf(result, config.idFields),
                action: AuditAction.DELETE,
                before: toJson(before, config),
                after: null,
              });
              return result;
            }
            case 'createMany': {
              const result = await query(args);
              const rows = Array.isArray(mutation.data) ? (mutation.data as EntityRecord[]) : [];
              for (const row of rows) {
                await writer.append({
                  entity: model,
                  entityId: entityIdOf(row, config.idFields),
                  action: AuditAction.CREATE,
                  before: null,
                  after: toJson(row, config),
                });
              }
              return result;
            }
            case 'updateMany': {
              const befores = await delegate.findMany({ where: mutation.where });
              const result = await query(args);
              const patch = (mutation.data ?? {}) as EntityRecord;
              for (const before of befores) {
                await writer.append({
                  entity: model,
                  entityId: entityIdOf(before, config.idFields),
                  action: AuditAction.UPDATE,
                  before: toJson(before, config),
                  after: toJson({ ...before, ...patch }, config),
                });
              }
              return result;
            }
            case 'deleteMany': {
              const befores = await delegate.findMany({ where: mutation.where });
              const result = await query(args);
              for (const before of befores) {
                await writer.append({
                  entity: model,
                  entityId: entityIdOf(before, config.idFields),
                  action: AuditAction.DELETE,
                  before: toJson(before, config),
                  after: null,
                });
              }
              return result;
            }
          }
        },
      },
    },
  });
}

/** Builds the audited client; `PrismaService` derives its type from this function. */
export function applyAuditExtension(base: PrismaClient) {
  return base.$extends(createAuditExtension(base, new AuditWriter(base)));
}
