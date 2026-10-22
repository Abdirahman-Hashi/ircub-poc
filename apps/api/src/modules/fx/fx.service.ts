import { HttpStatus, Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';

import { Currency, ErrorCode } from '@ircub/shared';

import { AppException } from '../../common/errors/app.exception';
import { UNIT_RATE } from '../../common/money/money.constants';
import { convertToLocal, roundRate, toDecimal } from '../../common/money/money.rules';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemConfigKey } from '../system-config/system-config.keys';
import { SystemConfigService } from '../system-config/system-config.service';

import { FX_API, FX_RATE_PROVIDER, FX_SOURCE } from './fx.constants';
import { FX_MESSAGES } from './fx.messages';
import { isStale } from './fx.rules';

import type { FxRateResponseDto } from './dto/fx-rate.response.dto';
import type { ConversionResult, FxRateProvider, StoredRate } from './fx.types';
import type { Decimal } from 'decimal.js';

/**
 * Exchange rates (D9, D15): `getRate` asks the provider, stores the quote as history and
 * returns it; if the provider is down it falls back to the latest stored rate, logging a
 * warning and flagging `stale` when that rate is older than the configured window.
 * A scheduled refresh every `FX_REFRESH_MINUTES` keeps a fresh USD→local quote so captures
 * rarely hit the fallback (the interval is read at boot; a config change applies on restart).
 */
@Injectable()
export class FxService implements OnModuleInit {
  private readonly logger = new Logger(FxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly systemConfig: SystemConfigService,
    @Inject(FX_RATE_PROVIDER) private readonly provider: FxRateProvider,
    private readonly scheduler: SchedulerRegistry,
  ) {}

  async onModuleInit(): Promise<void> {
    const minutes = await this.systemConfig.get(SystemConfigKey.FX_REFRESH_MINUTES);
    const timer = setInterval(() => {
      this.refresh().catch((error: unknown) => {
        this.logger.error(
          { msg: 'fx refresh failed' },
          error instanceof Error ? error.stack : String(error),
        );
      });
    }, minutes * FX_API.MS_PER_MINUTE);
    this.scheduler.addInterval(FX_API.REFRESH_JOB, timer);
  }

  async getRate(base: Currency, quote: Currency): Promise<StoredRate> {
    if (base === quote) {
      return { base, quote, rate: UNIT_RATE, asOf: new Date(), source: FX_API.PATH, stale: false };
    }
    try {
      const fetched = await this.provider.fetch(base);
      const value = fetched.rates[quote];
      if (value === undefined) {
        throw new Error(`provider quote has no ${quote} rate`);
      }
      const rate = roundRate(value);
      await this.prisma.fxRate.create({
        data: {
          base,
          quote,
          rate: rate.toFixed(),
          asOf: fetched.asOf,
          source: FX_SOURCE.MOCK_PROVIDER,
        },
      });
      return {
        base,
        quote,
        rate,
        asOf: fetched.asOf,
        source: FX_SOURCE.MOCK_PROVIDER,
        stale: false,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const latest = await this.latestStored(base, quote);
      if (latest === null) {
        this.logger.error({
          msg: 'fx provider down and no stored rate',
          base,
          quote,
          error: message,
        });
        throw new AppException(
          ErrorCode.FX_RATE_UNAVAILABLE,
          FX_MESSAGES.RATE_UNAVAILABLE,
          HttpStatus.SERVICE_UNAVAILABLE,
          { base, quote },
        );
      }
      const staleAfter = await this.systemConfig.get(SystemConfigKey.FX_STALE_AFTER_MINUTES);
      const stale = isStale(latest.asOf, new Date(), staleAfter);
      this.logger.warn({
        msg: 'fx provider down; using stored rate',
        base,
        quote,
        asOf: latest.asOf,
        stale,
        error: message,
      });
      return { ...latest, stale };
    }
  }

  /** Latest stored rate without touching the provider (history/UI). */
  async latestRate(base: Currency, quote: Currency): Promise<StoredRate> {
    if (base === quote) {
      return { base, quote, rate: UNIT_RATE, asOf: new Date(), source: FX_API.PATH, stale: false };
    }
    const latest = await this.latestStored(base, quote);
    if (latest === null) {
      throw new AppException(
        ErrorCode.FX_RATE_UNAVAILABLE,
        FX_MESSAGES.RATE_UNAVAILABLE,
        HttpStatus.SERVICE_UNAVAILABLE,
        { base, quote },
      );
    }
    const staleAfter = await this.systemConfig.get(SystemConfigKey.FX_STALE_AFTER_MINUTES);
    return { ...latest, stale: isStale(latest.asOf, new Date(), staleAfter) };
  }

  /** Converts a captured amount into the local currency at the rate retrieved now (D15). */
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
    const stored = await this.getRate(currency, localCurrency);
    const { localAmount, fxRate } = convertToLocal(amount, stored.rate);
    return { localAmount, fxRate, fxRateAt: stored.asOf, localCurrency };
  }

  /** Scheduled refresh (D15): keeps a fresh USD→local quote in history. */
  async refresh(): Promise<void> {
    const localCurrency = await this.systemConfig.get(SystemConfigKey.LOCAL_CURRENCY);
    for (const currency of Object.values(Currency)) {
      if (currency === localCurrency) {
        continue;
      }
      const result = await this.getRate(currency, localCurrency);
      this.logger.log({
        msg: 'fx refreshed',
        base: currency,
        quote: localCurrency,
        rate: result.rate.toFixed(),
        stale: result.stale,
      });
    }
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
      stale: false,
    }));
  }

  private async latestStored(
    base: Currency,
    quote: Currency,
  ): Promise<Omit<StoredRate, 'stale'> | null> {
    const row = await this.prisma.fxRate.findFirst({
      where: { base, quote },
      orderBy: { asOf: 'desc' },
    });
    return row === null
      ? null
      : { base, quote, rate: toDecimal(row.rate), asOf: row.asOf, source: row.source };
  }
}
