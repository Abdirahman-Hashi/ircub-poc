import { Injectable, Logger } from '@nestjs/common';

import type { Paginated } from '@ircub/shared';

import { AUDIT } from '../../common/audit/audit.constants';
import { computeAuditHash, verifyChain } from '../../common/audit/audit.rules';
import { parseSort, toPageSlice, toPaginated } from '../../common/pagination/pagination.rules';
import { PrismaService } from '../../prisma/prisma.service';

import { AUDIT_API } from './audit.constants';

import type { AuditFilterDto } from './dto/audit-filter.dto';
import type { AuditLogResponseDto } from './dto/audit-log.response.dto';
import type { AuditChainRow, ChainVerificationResult } from '../../common/audit/audit.types';
import type { AuditLog, Prisma } from '@prisma/client';

/** Read-only API over the audit chain; writing happens only through the Prisma extension. */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(filter: AuditFilterDto): Promise<Paginated<AuditLogResponseDto>> {
    const where: Prisma.AuditLogWhereInput = {
      ...(filter.entity === undefined ? {} : { entity: filter.entity }),
      ...(filter.entityId === undefined ? {} : { entityId: filter.entityId }),
      ...(filter.actorId === undefined ? {} : { actorId: filter.actorId }),
      ...(filter.from === undefined && filter.to === undefined
        ? {}
        : {
            createdAt: {
              ...(filter.from === undefined ? {} : { gte: filter.from }),
              ...(filter.to === undefined ? {} : { lte: filter.to }),
            },
          }),
    };
    const sort = parseSort(filter.sort, AUDIT_API.SORTABLE, { field: 'seq', direction: 'desc' });
    const { skip, take } = toPageSlice(filter.page, filter.pageSize);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { [sort.field]: sort.direction },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return toPaginated(rows.map(toResponse), total, filter.page, filter.pageSize);
  }

  /**
   * Recomputes every hash from genesis in batches. Streams in seq order so memory stays
   * flat regardless of log size; stops at the first broken link. Finally the tail is compared
   * with the chain head, so deleting the newest rows is reported as a break too.
   */
  async verify(): Promise<ChainVerificationResult> {
    const walked = await this.walkChain();
    if (!walked.ok) {
      return walked;
    }
    const head = await this.prisma.auditChainHead.findUnique({
      where: { id: AUDIT.CHAIN_HEAD_ID },
    });
    if (head === null) {
      return walked;
    }
    const headSeq = Number(head.lastSeq);
    if (head.lastSeq !== walked.lastSeq || head.lastHash !== walked.lastHash) {
      this.logger.warn({ msg: 'audit chain tail does not match the head', headSeq });
      return {
        ok: false,
        checked: walked.checked,
        firstBrokenSeq: Number(walked.lastSeq) + 1,
        headSeq,
      };
    }
    return { ok: true, checked: walked.checked, headSeq };
  }

  private async walkChain(): Promise<
    ChainVerificationResult & { readonly lastSeq: bigint; readonly lastHash: string }
  > {
    let cursorSeq = BigInt(0);
    let checked = 0;
    let prevHash = AUDIT.GENESIS_HASH;

    for (;;) {
      const batch = await this.prisma.auditLog.findMany({
        where: { seq: { gt: cursorSeq } },
        orderBy: { seq: 'asc' },
        take: AUDIT.VERIFY_BATCH_SIZE,
      });
      if (batch.length === 0) {
        break;
      }
      const rows: AuditChainRow[] = batch.map(toChainRow);
      // Re-link the batch to the running chain by checking the first row against prevHash.
      const first = rows[0];
      if (first !== undefined && first.prevHash !== prevHash) {
        this.logger.warn({
          msg: 'audit chain broken at batch boundary',
          seq: first.seq.toString(),
        });
        return {
          ok: false,
          checked: checked + 1,
          firstBrokenSeq: Number(first.seq),
          lastSeq: cursorSeq,
          lastHash: prevHash,
        };
      }
      const result = verifyChainFrom(rows, prevHash, cursorSeq);
      checked += result.checked;
      if (!result.ok) {
        return { ...result, checked, lastSeq: cursorSeq, lastHash: prevHash };
      }
      const last = rows[rows.length - 1];
      if (last === undefined) {
        break;
      }
      prevHash = last.hash;
      cursorSeq = last.seq;
    }
    return { ok: true, checked, lastSeq: cursorSeq, lastHash: prevHash };
  }
}

function verifyChainFrom(
  rows: readonly AuditChainRow[],
  prevHash: string,
  prevSeq: bigint,
): ChainVerificationResult {
  if (prevSeq === BigInt(0)) {
    return verifyChain(rows);
  }
  // Continue from an arbitrary point: check links and hashes against the supplied tail.
  let expectedPrev = prevHash;
  let expectedSeq = prevSeq + BigInt(1);
  for (const row of rows) {
    const intact =
      row.prevHash === expectedPrev &&
      row.seq === expectedSeq &&
      computeAuditHash(row) === row.hash;
    if (!intact) {
      return { ok: false, checked: rows.length, firstBrokenSeq: Number(row.seq) };
    }
    expectedPrev = row.hash;
    expectedSeq = row.seq + BigInt(1);
  }
  return { ok: true, checked: rows.length };
}

function toChainRow(row: AuditLog): AuditChainRow {
  return {
    seq: row.seq,
    actorId: row.actorId,
    actorEmail: row.actorEmail,
    entity: row.entity,
    entityId: row.entityId,
    action: row.action,
    before: row.before,
    after: row.after,
    ip: row.ip,
    userAgent: row.userAgent,
    createdAt: row.createdAt,
    prevHash: row.prevHash,
    hash: row.hash,
  };
}

function toResponse(row: AuditLog): AuditLogResponseDto {
  return {
    seq: row.seq.toString(),
    actorId: row.actorId,
    actorEmail: row.actorEmail,
    entity: row.entity,
    entityId: row.entityId,
    action: row.action,
    before: row.before,
    after: row.after,
    ip: row.ip,
    userAgent: row.userAgent,
    createdAt: row.createdAt,
    hash: row.hash,
    prevHash: row.prevHash,
  };
}
