import { faker } from '@faker-js/faker';
import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { applyAuditExtension } from '../src/common/audit/audit.extension';

import { seedChannelPayments } from './seed/channel-payments.seed';
import { seedRevenueTargets, seedSummaries } from './seed/dashboard.seed';
import { seedDemoData } from './seed/demo-data.seed';
import { seedGlMappings, seedJournalBatches } from './seed/fmis.seed';
import { seedFxRate } from './seed/fx.seed';
import { seedPermissions } from './seed/permissions.seed';
import { seedRevenueTypes } from './seed/revenue-types.seed';
import { seedRoles } from './seed/roles.seed';
import {
  FAKER_SEED,
  SEED_ENV,
  SEED_FLAGS,
  SEED_LOG_LEVELS,
  SEED_PASSWORD,
} from './seed/seed.constants';
import { seedSodRules } from './seed/sod.seed';
import { seedSystemConfig } from './seed/system-config.seed';
import { seedUsers } from './seed/users.seed';
import { seedTariffs, seedWaterDemo } from './seed/water.seed';

/**
 * Entry point for `prisma db seed`. Deterministic (fixed faker seed) and idempotent: every
 * seeder upserts, so re-running refreshes reference data without duplicating it. The audit
 * extension is applied so seed mutations are chained into the audit log as actor SYSTEM.
 * Order matters: permissions → roles → users → SoD rule → revenue types → FX → demo data.
 */
async function main(): Promise<void> {
  // The audit writer logs every appended row at debug level; keep seed output readable.
  Logger.overrideLogger([...SEED_LOG_LEVELS]);
  faker.seed(FAKER_SEED);
  const base = new PrismaClient();
  const prisma = applyAuditExtension(base);
  const configuredPassword = process.env[SEED_ENV.PASSWORD]?.trim();
  const password =
    configuredPassword === undefined || configuredPassword.length === 0
      ? SEED_PASSWORD
      : configuredPassword;
  const mocksBaseUrl = process.env[SEED_ENV.MOCKS_BASE_URL];
  try {
    // Password rotation on a deployed instance: rewrite the six demo users only.
    if (process.argv.includes(SEED_FLAGS.USERS_ONLY)) {
      console.info(`seed: users ${await seedUsers(prisma, password)} (--users-only)`);
      return;
    }
    // Container boot (SEED_ON_BOOT): revenue targets are written by the last seeder, so their
    // presence proves an earlier run completed. Checking users instead left a database whose
    // first seed crashed halfway (users present, no water data) stuck that way for ever.
    if (process.argv.includes(SEED_FLAGS.IF_INCOMPLETE) && (await seedCompleted(base))) {
      console.info(`seed: already complete, skipping (${SEED_FLAGS.IF_INCOMPLETE})`);
      return;
    }
    console.info(`seed: system_config ${await seedSystemConfig(prisma)} keys`);
    console.info(`seed: permissions ${await seedPermissions(prisma)}`);
    console.info(`seed: roles ${await seedRoles(prisma)}`);
    console.info(`seed: users ${await seedUsers(prisma, password)}`);
    console.info(`seed: sod rules ${await seedSodRules(prisma)}`);
    console.info(`seed: revenue types ${await seedRevenueTypes(prisma)}`);
    console.info(`seed: fx rates ${await seedFxRate(prisma)}`);
    console.info(`seed: demo data ${await seedDemoData(prisma)}`);
    console.info(`seed: tariffs ${await seedTariffs(prisma)}`);
    console.info(`seed: water demo ${await seedWaterDemo(prisma)}`);
    console.info(`seed: channel payments ${await seedChannelPayments(prisma, mocksBaseUrl)}`);
    console.info(`seed: gl mappings ${await seedGlMappings(prisma)}`);
    console.info(`seed: journal batches ${await seedJournalBatches(prisma, mocksBaseUrl)}`);
    console.info(`seed: summaries ${await seedSummaries(prisma)}`);
    console.info(`seed: revenue targets ${await seedRevenueTargets(prisma)}`);
  } finally {
    await base.$disconnect();
  }
}

async function seedCompleted(prisma: PrismaClient): Promise<boolean> {
  return (await prisma.revenueTarget.count()) > 0;
}

main().catch((error: unknown) => {
  console.error('seed failed', error);
  process.exit(1);
});
