/** Money representation (docs/DECISIONS.md D9). */
export const MONEY = {
  /** Decimal places for amounts: Decimal(18,2). */
  AMOUNT_SCALE: 2,
  /** Decimal places for FX rates: Decimal(18,6). */
  FX_RATE_SCALE: 6,
  AMOUNT_PRECISION: 18,
} as const;
