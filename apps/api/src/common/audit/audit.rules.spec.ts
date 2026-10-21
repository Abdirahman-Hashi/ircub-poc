import { AuditAction } from '@ircub/shared';

import { AUDIT } from './audit.constants';
import {
  canonicalJson,
  computeAuditHash,
  entityIdOf,
  redactRecord,
  verifyChain,
} from './audit.rules';

import type { AuditChainRow, AuditHashInput } from './audit.types';

function buildChain(length: number): AuditChainRow[] {
  const rows: AuditChainRow[] = [];
  let prevHash = AUDIT.GENESIS_HASH;
  for (let i = 1; i <= length; i += 1) {
    const input: AuditHashInput = {
      seq: BigInt(i),
      actorId: null,
      actorEmail: 'SYSTEM',
      entity: 'User',
      entityId: `u${i}`,
      action: AuditAction.CREATE,
      before: null,
      after: { id: `u${i}`, email: `u${i}@ircub.test` },
      ip: null,
      userAgent: null,
      createdAt: new Date(Date.UTC(2026, 0, i)),
      prevHash,
    };
    const hash = computeAuditHash(input);
    rows.push({ ...input, hash });
    prevHash = hash;
  }
  return rows;
}

describe('canonicalJson', () => {
  it('sorts keys recursively so field order does not change the hash', () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: [{ z: 1, y: 2 }] } })).toBe(
      '{"a":{"c":[{"y":2,"z":1}],"d":2},"b":1}',
    );
  });

  it('serialises dates and bigints deterministically', () => {
    expect(canonicalJson({ at: new Date(0), n: BigInt(7) })).toBe(
      '{"at":"1970-01-01T00:00:00.000Z","n":"7"}',
    );
  });
});

describe('verifyChain', () => {
  it('accepts an intact chain', () => {
    expect(verifyChain(buildChain(5))).toEqual({ ok: true, checked: 5 });
  });

  it('accepts an empty log', () => {
    expect(verifyChain([])).toEqual({ ok: true, checked: 0 });
  });

  it('detects a tampered payload and reports its seq', () => {
    const rows = buildChain(5);
    const tampered = { ...rows[2], after: { id: 'u3', email: 'evil@ircub.test' } } as AuditChainRow;
    rows[2] = tampered;
    expect(verifyChain(rows)).toEqual({ ok: false, checked: 5, firstBrokenSeq: 3 });
  });

  it('detects a deleted row (gap in seq / broken link)', () => {
    const rows = buildChain(5);
    rows.splice(1, 1);
    expect(verifyChain(rows)).toMatchObject({ ok: false, firstBrokenSeq: 3 });
  });

  it('detects a re-hashed row whose predecessor link no longer matches', () => {
    const rows = buildChain(3);
    const forged = { ...rows[1], actorEmail: 'forger@ircub.test' } as AuditHashInput;
    rows[1] = { ...forged, hash: computeAuditHash(forged) };
    expect(verifyChain(rows)).toMatchObject({ ok: false, firstBrokenSeq: 3 });
  });
});

describe('redactRecord / entityIdOf', () => {
  it('replaces secret fields but keeps nulls', () => {
    expect(
      redactRecord({ id: 1, passwordHash: 'x', mfaSecret: null }, ['passwordHash', 'mfaSecret']),
    ).toEqual({
      id: 1,
      passwordHash: AUDIT.REDACTED,
      mfaSecret: null,
    });
  });

  it('builds composite entity ids', () => {
    expect(entityIdOf({ roleId: 'r1', permissionId: 'p1' }, ['roleId', 'permissionId'])).toBe(
      'r1:p1',
    );
    expect(entityIdOf({ id: 'u1' }, undefined)).toBe('u1');
  });
});
