import { PERMISSIONS } from '@ircub/shared';

import {
  applyOverrides,
  collectDescendantRoleIds,
  resolveEffectivePermissions,
  resolveInheritedPermissions,
  wouldCreateCycle,
} from './permissions.rules';

import type { RoleGraph, RoleNode } from './permissions.types';

function role(partial: Partial<RoleNode> & Pick<RoleNode, 'id'>): RoleNode {
  return {
    code: partial.id.toUpperCase(),
    name: partial.id,
    parentId: null,
    isSystem: false,
    permissionCodes: [],
    ...partial,
  };
}

/** officer ← supervisor ← director (three levels). */
const graph: RoleGraph = new Map(
  [
    role({
      id: 'officer',
      permissionCodes: [PERMISSIONS.PAYERS_VIEW, PERMISSIONS.PAYMENTS_CAPTURE],
    }),
    role({
      id: 'supervisor',
      parentId: 'officer',
      permissionCodes: [PERMISSIONS.REVERSALS_APPROVE],
    }),
    role({ id: 'director', parentId: 'supervisor', permissionCodes: [PERMISSIONS.DASHBOARD_VIEW] }),
    role({ id: 'auditor', permissionCodes: [PERMISSIONS.AUDIT_VIEW] }),
  ].map((r) => [r.id, r]),
);

describe('resolveEffectivePermissions', () => {
  it('unions a role with every ancestor across three levels', () => {
    expect([...resolveEffectivePermissions(['director'], graph)].sort()).toEqual(
      [
        PERMISSIONS.PAYERS_VIEW,
        PERMISSIONS.PAYMENTS_CAPTURE,
        PERMISSIONS.REVERSALS_APPROVE,
        PERMISSIONS.DASHBOARD_VIEW,
      ].sort(),
    );
  });

  it('unions across multiple held roles', () => {
    const held = resolveEffectivePermissions(['officer', 'auditor'], graph);
    expect(held.has(PERMISSIONS.AUDIT_VIEW)).toBe(true);
    expect(held.has(PERMISSIONS.PAYMENTS_CAPTURE)).toBe(true);
    expect(held.has(PERMISSIONS.REVERSALS_APPROVE)).toBe(false);
  });

  it('ignores unknown role ids and returns nothing for no roles', () => {
    expect(resolveEffectivePermissions(['ghost'], graph).size).toBe(0);
    expect(resolveEffectivePermissions([], graph).size).toBe(0);
  });

  it('terminates on a parent cycle and still returns the permissions seen', () => {
    const cyclic: RoleGraph = new Map(
      [
        role({ id: 'a', parentId: 'b', permissionCodes: [PERMISSIONS.PAYERS_VIEW] }),
        role({ id: 'b', parentId: 'a', permissionCodes: [PERMISSIONS.AUDIT_VIEW] }),
      ].map((r) => [r.id, r]),
    );
    expect([...resolveEffectivePermissions(['a'], cyclic)].sort()).toEqual(
      [PERMISSIONS.AUDIT_VIEW, PERMISSIONS.PAYERS_VIEW].sort(),
    );
  });
});

describe('resolveInheritedPermissions', () => {
  it('returns only what comes from ancestors', () => {
    const inherited = resolveInheritedPermissions('supervisor', graph);
    expect(inherited.has(PERMISSIONS.PAYERS_VIEW)).toBe(true);
    expect(inherited.has(PERMISSIONS.REVERSALS_APPROVE)).toBe(false);
  });
});

describe('collectDescendantRoleIds', () => {
  it('includes the role and every transitive child', () => {
    expect([...collectDescendantRoleIds('officer', graph)].sort()).toEqual([
      'director',
      'officer',
      'supervisor',
    ]);
    expect([...collectDescendantRoleIds('auditor', graph)]).toEqual(['auditor']);
  });
});

describe('wouldCreateCycle', () => {
  it('rejects making a role its own descendant', () => {
    expect(wouldCreateCycle('officer', 'director', graph)).toBe(true);
    expect(wouldCreateCycle('officer', 'officer', graph)).toBe(true);
  });

  it('allows re-parenting under an unrelated role or to top level', () => {
    expect(wouldCreateCycle('officer', 'auditor', graph)).toBe(false);
    expect(wouldCreateCycle('director', null, graph)).toBe(false);
  });
});

describe('applyOverrides', () => {
  it('evaluates a proposed permission set without mutating the original graph', () => {
    const proposed = applyOverrides(graph, {
      rolePermissionCodes: new Map([['officer', [PERMISSIONS.REVERSALS_CAPTURE]]]),
    });
    expect(
      resolveEffectivePermissions(['supervisor'], proposed).has(PERMISSIONS.REVERSALS_CAPTURE),
    ).toBe(true);
    expect(
      resolveEffectivePermissions(['supervisor'], graph).has(PERMISSIONS.REVERSALS_CAPTURE),
    ).toBe(false);
  });

  it('evaluates a proposed parent', () => {
    const proposed = applyOverrides(graph, { roleParentId: new Map([['auditor', 'officer']]) });
    expect(resolveEffectivePermissions(['auditor'], proposed).has(PERMISSIONS.PAYERS_VIEW)).toBe(
      true,
    );
  });
});
