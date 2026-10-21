import type { Prisma } from '@prisma/client';

export type RoleWithPermissions = Prisma.RoleGetPayload<{
  include: {
    permissions: { include: { permission: { select: { code: true } } } };
    _count: { select: { users: true; children: true } };
  };
}>;
