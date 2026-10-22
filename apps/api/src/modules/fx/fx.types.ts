import type { Currency } from '@ircub/shared';

import type { Decimal } from 'decimal.js';

export interface StoredRate {
  readonly base: Currency;
  readonly quote: Currency;
  readonly rate: Decimal;
  readonly asOf: Date;
  readonly source: string;
  /** Provider unreachable and the stored rate is older than the stale window. */
  readonly stale: boolean;
}

/** Everything a payment stores about its conversion (D9). */
export interface ConversionResult {
  readonly localAmount: Decimal;
  readonly fxRate: Decimal;
  readonly fxRateAt: Date | null;
  readonly localCurrency: Currency;
}

/** A quote from the provider: `rates[quote]` units of each currency per one `base`. */
export interface ProviderQuote {
  readonly base: Currency;
  readonly rates: Readonly<Partial<Record<Currency, number>>>;
  readonly asOf: Date;
}

/** External FX source (standards §3). The HTTP implementation calls the mock FX API. */
export interface FxRateProvider {
  fetch(base: Currency): Promise<ProviderQuote>;
}
