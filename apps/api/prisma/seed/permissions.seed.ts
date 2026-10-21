import { PERMISSION_DESCRIPTIONS, PERMISSION_GROUPS } from '@ircub/shared';

import type { ExtendedPrismaClient } from '../../src/prisma/prisma.types';

/** One row per code in @ircub/shared; descriptions and groups refreshed on every run. */
export async function seedPermissions(prisma: ExtendedPrismaClient): Promise<number> {
  let count = 0;
  for (const group of PERMISSION_GROUPS) {
    for (const code of group.permissions) {
      await prisma.permission.upsert({
        where: { code },
        create: { code, description: PERMISSION_DESCRIPTIONS[code], group: group.group },
        update: { description: PERMISSION_DESCRIPTIONS[code], group: group.group },
      });
      count += 1;
    }
  }
  return count;
}
