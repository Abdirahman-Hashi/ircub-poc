import { Logger } from '@nestjs/common';
import { Prisma, type PrismaClient } from '@prisma/client';

import { getRequestContext } from '../context/request-context.storage';

import { AUDIT, AUDIT_ACTOR } from './audit.constants';
import { computeAuditHash } from './audit.rules';

import type { AuditActor, AuditEntryInput, ChainHeadRow } from './audit.types';

/**
 * Appends one row to the hash chain. Runs in its own short transaction that locks the
 * single chain-head row FOR UPDATE, so concurrent writers serialise and every row's
 * `prevHash`/`seq` are consistent (D8). Uses the base (unextended) client so writing the
 * audit row is never itself audited.
 */
export class AuditWriter {
  private readonly logger = new Logger(AuditWriter.name);

  constructor(private readonly base: PrismaClient) {}

  async append(entry: AuditEntryInput): Promise<void> {
    const actor = AuditWriter.currentActor();
    await this.base.$transaction(async (tx) => {
      const [head] = await tx.$queryRaw<ChainHeadRow[]>`
        SELECT last_seq AS "lastSeq", last_hash AS "lastHash"
        FROM audit_chain_head WHERE id = ${AUDIT.CHAIN_HEAD_ID} FOR UPDATE`;
      if (head === undefined) {
        throw new Error('audit chain head row missing; run migrations');
      }
      const seq = head.lastSeq + BigInt(1);
      const createdAt = new Date();
      const hash = computeAuditHash({
        ...entry,
        ...actor,
        seq,
        createdAt,
        prevHash: head.lastHash,
      });

      await tx.auditLog.create({
        data: {
          seq,
          actorId: actor.actorId,
          actorEmail: actor.actorEmail,
          entity: entry.entity,
          entityId: entry.entityId,
          action: entry.action,
          before: entry.before ?? Prisma.DbNull,
          after: entry.after ?? Prisma.DbNull,
          ip: actor.ip,
          userAgent: actor.userAgent,
          createdAt,
          prevHash: head.lastHash,
          hash,
        },
      });
      await tx.auditChainHead.update({
        where: { id: AUDIT.CHAIN_HEAD_ID },
        data: { lastSeq: seq, lastHash: hash },
      });
    });
    this.logger.debug({
      msg: 'audit appended',
      entity: entry.entity,
      entityId: entry.entityId,
      action: entry.action,
    });
  }

  /** Actor from the request context, or SYSTEM for jobs, crons and the seed. */
  static currentActor(): AuditActor {
    const context = getRequestContext();
    return {
      actorId: context?.actorId ?? null,
      actorEmail: context?.actorEmail ?? AUDIT_ACTOR.SYSTEM_EMAIL,
      ip: context?.ip ?? null,
      userAgent: context?.userAgent ?? null,
    };
  }
}
