import { faker } from '@faker-js/faker';
import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { applyAuditExtension } from '../src/common/audit/audit.extension';

import { seedPermissions } from './seed/permissions.seed';
import { seedRoles } from './seed/roles.seed';
import { FAKER_SEED, SEED_LOG_LEVELS } from './seed/seed.constants';
import { seedSodRules } from './seed/sod.seed';
import { seedSystemConfig } from './seed/system-config.seed';
import { seedUsers } from './seed/users.seed';

/**
 * Entry point for `prisma db seed`. Deterministic (fixed faker seed) and idempotent: every
 * seeder upserts, so re-running refreshes reference data without duplicating it. The audit
 * extension is applied so seed mutations are chained into the audit log as actor SYSTEM.
 * Order matters: permissions → roles → users → SoD rule.
 */
async function main(): Promise<void> {
  // The audit writer logs every appended row at debug level; keep seed output readable.
  Logger.overrideLogger([...SEED_LOG_LEVELS]);
  faker.seed(FAKER_SEED);
  const base = new PrismaClient();
  const prisma = applyAuditExtension(base);
  try {
    console.info(`seed: system_config ${await seedSystemConfig(prisma)} keys`);
    console.info(`seed: permissions ${await seedPermissions(prisma)}`);
    console.info(`seed: roles ${await seedRoles(prisma)}`);
    console.info(`seed: users ${await seedUsers(prisma)}`);
    console.info(`seed: sod rules ${await seedSodRules(prisma)}`);
  } finally {
    await base.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('seed failed', error);
  process.exit(1);
});
