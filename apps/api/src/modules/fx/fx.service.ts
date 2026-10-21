import { HttpStatus, Injectable } from '@nestjs/common';

import { type Currency, ErrorCode } from '@ircub/shared';

import { AppException } from '../../common/errors/app.exception';
import { UNIT_RATE } from '../../common/money/money.constants';
import { convertToLocal, toDecimal } from '../../common/money/money.rules';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemConfigKey } from '../system-config/system-config.keys';
import { SystemConfigService } from '../system-config/system-config.service';

import { FX_API } from './fx.constants';
import { FX_MESSAGES } from './fx.messages';

import type { FxRateResponseDto } from './dto/fx-rate.response.dto';
import type { ConversionResult, StoredRate } from './fx.types';
import type { Decimal } from 'decimal.js';

/**
 * Exchange rates as stored history (D9). Phase 2 reads the latest stored rate (seeded);
 * phase 4 adds the `FxRateProvider` that refreshes it from the mock FX API.
 */
@Injectable()
export class FxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly systemConfig: SystemConfigService,
  ) {}

  async latestRate(base: Currency, quote: Currency): Promise<StoredRate> {
    if (base === quote) {
      return { base, quote, rate: UNIT_RATE, asOf: new Date(), source: FX_API.PATH };
    }
    const row = await this.prisma.fxRate.findFirst({
      where: { base, quote },
      orderBy: { asOf: 'desc' },
    });
    if (row === null) {
      throw new AppException(
        ErrorCode.FX_RATE_UNAVAILABLE,
        FX_MESSAGES.RATE_UNAVAILABLE,
        HttpStatus.SERVICE_UNAVAILABLE,
        {
          base,
          quote,
        },
      );
    }
    return { base, quote, rate: toDecimal(row.rate), asOf: row.asOf, source: row.source };
  }

  /** Converts a captured amount into the local currency with the rate that applied. */
  async toLocal(amount: Decimal, currency: Currency): Promise<ConversionResult> {
    const localCurrency = await this.systemConfig.get(SystemConfigKey.LOCAL_CURRENCY);
    if (currency === localCurrency) {
      return {
        localAmount: convertToLocal(amount).localAmount,
        fxRate: UNIT_RATE,
        fxRateAt: null,
        localCurrency,
      };
    }
    const stored = await this.latestRate(currency, localCurrency);
    const { localAmount, fxRate } = convertToLocal(amount, stored.rate);
    return { localAmount, fxRate, fxRateAt: stored.asOf, localCurrency };
  }

  async history(base: Currency, quote: Currency): Promise<FxRateResponseDto[]> {
    const rows = await this.prisma.fxRate.findMany({
      where: { base, quote },
      orderBy: { asOf: 'desc' },
      take: FX_API.HISTORY_LIMIT,
    });
    return rows.map((row) => ({
      base: row.base,
      quote: row.quote,
      rate: row.rate.toString(),
      asOf: row.asOf,
      source: row.source,
    }));
  }
}
