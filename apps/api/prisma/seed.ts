import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';

import { FAKER_SEED } from './seed/seed.constants';
import { seedSystemConfig } from './seed/system-config.seed';

/**
 * Entry point for `prisma db seed`. Deterministic (fixed faker seed) and idempotent: every
 * seeder upserts, so re-running refreshes reference data without duplicating it.
 * Later phases add seeders to the list in dependency order (roles → users → payers → …).
 */
async function main(): Promise<void> {
  faker.seed(FAKER_SEED);
  const prisma = new PrismaClient();
  try {
    const configCount = await seedSystemConfig(prisma);
    console.info(`seed: system_config ${configCount} keys`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('seed failed', error);
  process.exit(1);
});
