import { PERMISSIONS } from '@ircub/shared';

import { normalisePair } from '../../src/modules/sod/sod.rules';

import type { ExtendedPrismaClient } from '../../src/prisma/prisma.types';

/** D7: the user who captures a reversal cannot approve it, at role level. */
export async function seedSodRules(prisma: ExtendedPrismaClient): Promise<number> {
  const [permissionACode, permissionBCode] = normalisePair(
    PERMISSIONS.REVERSALS_CAPTURE,
    PERMISSIONS.REVERSALS_APPROVE,
  );
  await prisma.sodRule.upsert({
    where: { permissionACode_permissionBCode: { permissionACode, permissionBCode } },
    create: {
      permissionACode,
      permissionBCode,
      description: 'The user who captures a reversal cannot approve it.',
    },
    update: {},
  });
  return 1;
}
