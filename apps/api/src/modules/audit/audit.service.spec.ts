import { AUDIT } from '../../common/audit/audit.constants';
import { computeAuditHash } from '../../common/audit/audit.rules';

import { AuditService } from './audit.service';

import type { AuditChainRow } from '../../common/audit/audit.types';

function row(seq: number, prevHash: string): AuditChainRow {
  const base = {
    seq: BigInt(seq),
    actorId: null,
    actorEmail: 'SYSTEM',
    entity: 'Payer',
    entityId: `p${seq}`,
    action: 'CREATE' as const,
    before: null,
    after: { id: `p${seq}` },
    ip: null,
    userAgent: null,
    createdAt: new Date('2026-10-22T00:00:00.000Z'),
    prevHash,
  };
  return { ...base, hash: computeAuditHash(base) };
}

function chain(length: number): AuditChainRow[] {
  const rows: AuditChainRow[] = [];
  let prev = AUDIT.GENESIS_HASH;
  for (let seq = 1; seq <= length; seq += 1) {
    const next = row(seq, prev);
    rows.push(next);
    prev = next.hash;
  }
  return rows;
}

function build(rows: AuditChainRow[], head: { lastSeq: bigint; lastHash: string } | null) {
  const prisma = {
    auditLog: {
      findMany: jest
        .fn()
        .mockImplementation(({ where }: { where: { seq: { gt: bigint } } }) =>
          Promise.resolve(rows.filter((r) => r.seq > where.seq.gt)),
        ),
    },
    auditChainHead: { findUnique: jest.fn().mockResolvedValue(head) },
  };
  return new AuditService(prisma as never);
}

describe('AuditService.verify', () => {
  it('passes when every link holds and the tail matches the chain head', async () => {
    const rows = chain(3);
    const last = rows[rows.length - 1];
    const service = build(rows, { lastSeq: BigInt(3), lastHash: last?.hash ?? '' });
    expect(await service.verify()).toEqual({ ok: true, checked: 3, headSeq: 3 });
  });

  it('reports the first seq missing when the newest rows were deleted', async () => {
    const rows = chain(3);
    const last = rows[rows.length - 1];
    const service = build(rows.slice(0, 2), { lastSeq: BigInt(3), lastHash: last?.hash ?? '' });
    expect(await service.verify()).toEqual({
      ok: false,
      checked: 2,
      firstBrokenSeq: 3,
      headSeq: 3,
    });
  });

  it('refuses to vouch for the chain when the head row is missing', async () => {
    const service = build(chain(2), null);
    expect(await service.verify()).toEqual({ ok: false, checked: 2, firstBrokenSeq: 3 });
  });

  it('reports a tampered row', async () => {
    const rows = chain(3);
    const tampered = rows.map((r) => (r.seq === BigInt(2) ? { ...r, entityId: 'x' } : r));
    const last = rows[rows.length - 1];
    const service = build(tampered, { lastSeq: BigInt(3), lastHash: last?.hash ?? '' });
    expect(await service.verify()).toMatchObject({ ok: false, firstBrokenSeq: 2 });
  });
});
