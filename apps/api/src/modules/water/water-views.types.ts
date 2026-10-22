import type { Prisma } from '@prisma/client';

export type TariffWithTiers = Prisma.TariffCategoryGetPayload<{ include: { tiers: true } }>;

export type ReadingWithMeter = Prisma.MeterReadingGetPayload<{
  include: {
    meter: {
      select: { serial: true; accountId: true; account: { select: { accountNumber: true } } };
    };
  };
}>;

export type MeterWithLatest = Prisma.MeterGetPayload<{
  include: {
    readings: {
      include: {
        meter: {
          select: { serial: true; accountId: true; account: { select: { accountNumber: true } } };
        };
      };
    };
  };
}>;

export type WaterAccountWithRelations = Prisma.WaterAccountGetPayload<{
  include: {
    payer: { select: { id: true; tin: true; name: true } };
    tariffCategory: { select: { id: true; code: true; name: true } };
    meters: {
      include: {
        readings: {
          include: {
            meter: {
              select: {
                serial: true;
                accountId: true;
                account: { select: { accountNumber: true } };
              };
            };
          };
        };
      };
    };
    bills: {
      select: { consumptionCharge: true; fixedCharge: true; paidAmount: true; status: true };
    };
  };
}>;

export type BillWithRelations = Prisma.BillGetPayload<{
  include: {
    account: { select: { id: true; accountNumber: true; serviceAddress: true } };
    payer: { select: { id: true; tin: true; name: true } };
    cycle: { select: { period: true } };
  };
}>;

export type CycleRow = Prisma.BillingCycleGetPayload<Record<string, never>>;
