import type { Currency } from '@ircub/shared';

import type { Decimal } from 'decimal.js';

export interface StoredRate {
  readonly base: Currency;
  readonly quote: Currency;
  readonly rate: Decimal;
  readonly asOf: Date;
  readonly source: string;
}

/** Everything a payment stores about its conversion (D9). */
export interface ConversionResult {
  readonly localAmount: Decimal;
  readonly fxRate: Decimal;
  readonly fxRateAt: Date | null;
  readonly localCurrency: Currency;
}
