import { Injectable, Logger } from '@nestjs/common';

import type { Currency } from '@ircub/shared';

import { AppConfigService } from '../../config/app-config.service';

import { FX_API } from './fx.constants';

import type { FxRateProvider, ProviderQuote } from './fx.types';

/** Pulls `GET /rates?base=` from the mock FX API; swapped for a real provider by DI. */
@Injectable()
export class HttpFxRateProvider implements FxRateProvider {
  private readonly logger = new Logger(HttpFxRateProvider.name);

  constructor(private readonly config: AppConfigService) {}

  async fetch(base: Currency): Promise<ProviderQuote> {
    const url = new URL(FX_API.PROVIDER_PATH, this.config.mocksBaseUrl);
    url.searchParams.set('base', base);
    const response = await fetch(url, { signal: AbortSignal.timeout(FX_API.PROVIDER_TIMEOUT_MS) });
    if (!response.ok) {
      throw new Error(`fx provider responded ${response.status}`);
    }
    const body = (await response.json()) as {
      base: Currency;
      rates: Partial<Record<Currency, number>>;
      asOf: string;
    };
    this.logger.debug({ msg: 'fx quote fetched', base, asOf: body.asOf });
    return { base: body.base, rates: body.rates, asOf: new Date(body.asOf) };
  }
}
