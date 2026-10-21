import type { Decimal } from 'decimal.js';

/** Anything Prisma or a DTO may hand us that represents money. */
export type DecimalLike = Decimal | string | number | { toString(): string };

export interface LocalConversion {
  readonly localAmount: Decimal;
  readonly fxRate: Decimal;
}
