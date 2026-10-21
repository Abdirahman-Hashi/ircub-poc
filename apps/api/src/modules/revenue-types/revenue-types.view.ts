import type { RevenueTypeView } from '@ircub/shared';

import type { RevenueType } from '@prisma/client';

export function toRevenueTypeView(row: RevenueType): RevenueTypeView {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    rateType: row.rateType,
    rate: row.rate.toFixed(),
    glCode: row.glCode,
    active: row.active,
    description: row.description,
  };
}
