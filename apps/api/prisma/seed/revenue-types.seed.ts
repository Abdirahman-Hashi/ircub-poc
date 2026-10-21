import { RateType } from '@ircub/shared';

import type { RevenueTypeSeed } from './seed.types';
import type { ExtendedPrismaClient } from '../../src/prisma/prisma.types';

/** Six revenue streams; WATER is the GL carrier for water collections (phase 3, D17). */
export const REVENUE_TYPE_SEEDS: readonly RevenueTypeSeed[] = [
  {
    code: 'BUSINESS_LICENCE',
    name: 'Business licence',
    rateType: RateType.FIXED,
    rate: '150000.00',
    glCode: '4010',
    description: 'Annual trading licence',
  },
  {
    code: 'PROPERTY_RATE',
    name: 'Property rate',
    rateType: RateType.PERCENT,
    rate: '0.50',
    glCode: '4020',
    description: '0.5 % of assessed property value per year',
  },
  {
    code: 'MARKET_FEE',
    name: 'Market fee',
    rateType: RateType.FIXED,
    rate: '25000.00',
    glCode: '4030',
    description: 'Monthly market stall fee',
  },
  {
    code: 'VEHICLE_LICENCE',
    name: 'Vehicle licence',
    rateType: RateType.FIXED,
    rate: '80000.00',
    glCode: '4040',
    description: 'Annual vehicle licence',
  },
  {
    code: 'SIGNAGE_FEE',
    name: 'Signage fee',
    rateType: RateType.FIXED,
    rate: '40000.00',
    glCode: '4050',
    description: 'Annual advertising signage fee',
  },
  {
    code: 'WATER',
    name: 'Water supply',
    rateType: RateType.FIXED,
    rate: '0.00',
    glCode: '4100',
    description: 'Water bills (amount comes from the billing cycle)',
  },
];

export async function seedRevenueTypes(prisma: ExtendedPrismaClient): Promise<number> {
  for (const seed of REVENUE_TYPE_SEEDS) {
    await prisma.revenueType.upsert({
      where: { code: seed.code },
      create: { ...seed, active: true },
      update: { name: seed.name, glCode: seed.glCode, description: seed.description },
    });
  }
  return REVENUE_TYPE_SEEDS.length;
}
