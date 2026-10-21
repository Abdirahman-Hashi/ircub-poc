import { Currency } from '@ircub/shared';

import { FX_SOURCE } from '../../src/modules/fx/fx.constants';

import { SEED_FX_RATE } from './seed.constants';

import type { ExtendedPrismaClient } from '../../src/prisma/prisma.types';

/** One USD→SOS rate so foreign-currency captures work before phase 4 refreshes rates. */
export async function seedFxRate(prisma: ExtendedPrismaClient): Promise<number> {
  const existing = await prisma.fxRate.findFirst({
    where: { base: Currency.USD, quote: Currency.SOS, source: FX_SOURCE.SEED },
  });
  if (existing === null) {
    await prisma.fxRate.create({
      data: {
        base: Currency.USD,
        quote: Currency.SOS,
        rate: SEED_FX_RATE,
        asOf: new Date(),
        source: FX_SOURCE.SEED,
      },
    });
  }
  return 1;
}
