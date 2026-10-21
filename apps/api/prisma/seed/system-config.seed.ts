import {
  SYSTEM_CONFIG_DEFAULTS,
  SYSTEM_CONFIG_DESCRIPTIONS,
  SystemConfigKey,
} from '../../src/modules/system-config/system-config.keys';

import type { PrismaClient } from '@prisma/client';

/**
 * Inserts every SystemConfigKey with its typed default. Idempotent: existing rows keep the
 * value an administrator may have changed; only the description is refreshed.
 */
export async function seedSystemConfig(prisma: PrismaClient): Promise<number> {
  const keys = Object.values(SystemConfigKey);
  for (const key of keys) {
    await prisma.systemConfig.upsert({
      where: { key },
      create: {
        key,
        value: SYSTEM_CONFIG_DEFAULTS[key],
        description: SYSTEM_CONFIG_DESCRIPTIONS[key],
      },
      update: { description: SYSTEM_CONFIG_DESCRIPTIONS[key] },
    });
  }
  return keys.length;
}
