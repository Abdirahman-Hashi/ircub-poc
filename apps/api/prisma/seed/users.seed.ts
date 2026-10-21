import { argon2id, hash } from 'argon2';

import { ROLES } from '@ircub/shared';

import { SEED_EMAIL_DOMAIN, SEED_PASSWORD } from './seed.constants';
import { requireValue } from './seed.utils';

import type { UserSeed } from './seed.types';
import type { ExtendedPrismaClient } from '../../src/prisma/prisma.types';

/** Six demo users (CLAUDE.md). Customer is linked to a payer in phase 2. */
export const USER_SEEDS: readonly UserSeed[] = [
  {
    email: `admin@${SEED_EMAIL_DOMAIN}`,
    fullName: 'Amina Abdi',
    roleCodes: [ROLES.SYSTEM_ADMINISTRATOR],
  },
  {
    email: `supervisor@${SEED_EMAIL_DOMAIN}`,
    fullName: 'Hassan Yusuf',
    roleCodes: [ROLES.REVENUE_SUPERVISOR],
  },
  {
    email: `officer@${SEED_EMAIL_DOMAIN}`,
    fullName: 'Fadumo Ali',
    roleCodes: [ROLES.REVENUE_OFFICER],
  },
  {
    email: `water@${SEED_EMAIL_DOMAIN}`,
    fullName: 'Mohamed Warsame',
    roleCodes: [ROLES.WATER_BILLING_OFFICER],
  },
  { email: `auditor@${SEED_EMAIL_DOMAIN}`, fullName: 'Sahra Omar', roleCodes: [ROLES.AUDITOR] },
  {
    email: `customer1@${SEED_EMAIL_DOMAIN}`,
    fullName: 'Abdullahi Noor',
    roleCodes: [ROLES.CUSTOMER],
  },
];

/**
 * Idempotent: existing users keep their id and MFA state; the password is reset to the demo
 * value so a fresh checkout always matches the README.
 */
export async function seedUsers(prisma: ExtendedPrismaClient): Promise<number> {
  const roles = await prisma.role.findMany({ select: { id: true, code: true } });
  const roleIdByCode = new Map(roles.map((row) => [row.code, row.id]));
  const passwordHash = await hash(SEED_PASSWORD, { type: argon2id });

  for (const seed of USER_SEEDS) {
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      create: { email: seed.email, fullName: seed.fullName, passwordHash },
      update: { fullName: seed.fullName, passwordHash, failedLoginCount: 0, lockedUntil: null },
    });
    if ((await prisma.passwordHistory.count({ where: { userId: user.id } })) === 0) {
      await prisma.passwordHistory.create({ data: { userId: user.id, passwordHash } });
    }
    const roleIds = seed.roleCodes.map((code) => requireValue(roleIdByCode, code, 'role'));
    await prisma.userRole.deleteMany({ where: { userId: user.id, roleId: { notIn: roleIds } } });
    for (const roleId of roleIds) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId } },
        create: { userId: user.id, roleId },
        update: {},
      });
    }
  }
  return USER_SEEDS.length;
}
