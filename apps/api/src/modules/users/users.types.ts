import type { USERS_API } from './users.constants';
import type { Prisma } from '@prisma/client';

export type UserSortField = (typeof USERS_API.SORTABLE)[number];

export type UserWithRoles = Prisma.UserGetPayload<{
  include: { roles: { include: { role: { select: { id: true; code: true; name: true } } } } };
}>;
