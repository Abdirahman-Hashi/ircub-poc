import { PERMISSION_CODES, PERMISSIONS, ROLES } from '@ircub/shared';

import { requireValue } from './seed.utils';

import type { RoleSeed } from './seed.types';
import type { ExtendedPrismaClient } from '../../src/prisma/prisma.types';

const VIEW_ONLY = [
  PERMISSIONS.PAYERS_VIEW,
  PERMISSIONS.ASSESSMENTS_VIEW,
  PERMISSIONS.PAYMENTS_VIEW,
  PERMISSIONS.BILLS_VIEW,
  PERMISSIONS.FX_VIEW,
  PERMISSIONS.RECONCILIATION_VIEW,
  PERMISSIONS.FMIS_VIEW,
  PERMISSIONS.DASHBOARD_VIEW,
  PERMISSIONS.ALERTS_VIEW,
  PERMISSIONS.REPORTS_VIEW,
] as const;

/**
 * The six built-in roles (brief Module 1). Hierarchy: Water Billing Officer inherits
 * Revenue Officer. The System Administrator holds everything except `reversals.capture`
 * so the seeded SoD rule (`reversals.capture` ⟂ `reversals.approve`) is satisfiable with
 * no superuser exemption — see docs/ASSUMPTIONS.md.
 */
export const ROLE_SEEDS: readonly RoleSeed[] = [
  {
    code: ROLES.SYSTEM_ADMINISTRATOR,
    name: 'System Administrator',
    description:
      'Creates users and roles, edits configuration; approves but never captures reversals.',
    parentCode: null,
    permissions: { allExcept: [PERMISSIONS.REVERSALS_CAPTURE] },
  },
  {
    code: ROLES.REVENUE_OFFICER,
    name: 'Revenue Officer',
    description: 'Registers payers, creates assessments, captures payments and reversal requests.',
    parentCode: null,
    permissions: [
      PERMISSIONS.PAYERS_VIEW,
      PERMISSIONS.PAYERS_REGISTER,
      PERMISSIONS.ASSESSMENTS_VIEW,
      PERMISSIONS.ASSESSMENTS_CREATE,
      PERMISSIONS.PAYMENTS_VIEW,
      PERMISSIONS.PAYMENTS_CAPTURE,
      PERMISSIONS.REVERSALS_CAPTURE,
      PERMISSIONS.BULK_UPLOADS_CREATE,
      PERMISSIONS.BILLS_VIEW,
      PERMISSIONS.FX_VIEW,
      PERMISSIONS.REPORTS_VIEW,
    ],
  },
  {
    code: ROLES.REVENUE_SUPERVISOR,
    name: 'Revenue Supervisor',
    description:
      'Views, approves and reverses revenue transactions; oversees reconciliation and FMIS.',
    parentCode: null,
    permissions: [
      ...VIEW_ONLY,
      PERMISSIONS.PAYERS_REVIEW_DUPLICATES,
      PERMISSIONS.REVENUE_TYPES_MANAGE,
      PERMISSIONS.PAYMENTS_SUPERVISE,
      PERMISSIONS.REVERSALS_APPROVE,
      PERMISSIONS.BULK_UPLOADS_CREATE,
      PERMISSIONS.RECONCILIATION_RUN,
      PERMISSIONS.FMIS_POST,
      PERMISSIONS.GL_MAPPINGS_MANAGE,
      PERMISSIONS.TARGETS_MANAGE,
    ],
  },
  {
    code: ROLES.WATER_BILLING_OFFICER,
    name: 'Water Billing Officer',
    description: 'Captures meter readings and runs billing cycles; inherits Revenue Officer.',
    parentCode: ROLES.REVENUE_OFFICER,
    permissions: [PERMISSIONS.METERS_READ, PERMISSIONS.BILLING_RUN, PERMISSIONS.BILLING_RELEASE],
  },
  {
    code: ROLES.AUDITOR,
    name: 'Auditor',
    description: 'View-only access to transactions, audit logs and reports.',
    parentCode: null,
    permissions: [...VIEW_ONLY, PERMISSIONS.AUDIT_VIEW],
  },
  {
    code: ROLES.CUSTOMER,
    name: 'Taxpayer / Customer',
    description: 'Views own bills and assessments and makes payments.',
    parentCode: null,
    permissions: [PERMISSIONS.SELF_VIEW, PERMISSIONS.SELF_PAY],
  },
];

export async function seedRoles(prisma: ExtendedPrismaClient): Promise<number> {
  const permissionRows = await prisma.permission.findMany({ select: { id: true, code: true } });
  const permissionIdByCode = new Map(permissionRows.map((row) => [row.code, row.id]));

  // Pass 1: roles without parents so every parent exists before pass 2 links them.
  const roleIdByCode = new Map<string, string>();
  for (const seed of ROLE_SEEDS) {
    const role = await prisma.role.upsert({
      where: { code: seed.code },
      create: { code: seed.code, name: seed.name, description: seed.description, isSystem: true },
      update: { name: seed.name, description: seed.description, isSystem: true },
    });
    roleIdByCode.set(seed.code, role.id);
  }
  // Pass 2: hierarchy and permission matrix.
  for (const seed of ROLE_SEEDS) {
    const roleId = requireValue(roleIdByCode, seed.code, 'role');
    const parentId = seed.parentCode === null ? null : (roleIdByCode.get(seed.parentCode) ?? null);
    await prisma.role.update({ where: { id: roleId }, data: { parentId } });

    const codes = Array.isArray(seed.permissions)
      ? seed.permissions
      : PERMISSION_CODES.filter(
          (code) =>
            !(seed.permissions as { allExcept: readonly string[] }).allExcept.includes(code),
        );
    const desired = new Set(
      codes.map((code) => requireValue(permissionIdByCode, code, 'permission')),
    );
    const existing = await prisma.rolePermission.findMany({
      where: { roleId },
      select: { permissionId: true },
    });
    const existingIds = new Set(existing.map((row) => row.permissionId));

    const toRemove = [...existingIds].filter((id) => !desired.has(id));
    const toAdd = [...desired].filter((id) => !existingIds.has(id));
    if (toRemove.length > 0) {
      await prisma.rolePermission.deleteMany({ where: { roleId, permissionId: { in: toRemove } } });
    }
    if (toAdd.length > 0) {
      await prisma.rolePermission.createMany({
        data: toAdd.map((permissionId) => ({ roleId, permissionId })),
      });
    }
  }
  return ROLE_SEEDS.length;
}
