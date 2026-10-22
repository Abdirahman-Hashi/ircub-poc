import { HttpStatus, Injectable } from '@nestjs/common';
import { subMonths } from 'date-fns';

import { DASHBOARD, ErrorCode, type ForecastModel } from '@ircub/shared';

import { AppException } from '../../common/errors/app.exception';
import { AMOUNT_SCALE } from '../../common/money/money.constants';
import { toDecimal } from '../../common/money/money.rules';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemConfigKey } from '../system-config/system-config.keys';
import { SystemConfigService } from '../system-config/system-config.service';

import { DASHBOARD_API } from './dashboard.constants';
import { DASHBOARD_MESSAGES } from './dashboard.messages';
import { holtForecast, olsForecast, periodsBetween, toPeriodKey } from './dashboard.rules';

import type { FittedForecast, MonthlyTotal } from './dashboard.types';
import type { ForecastResponseDto, ForecastSeriesResponseDto } from './dto/forecast.response.dto';

/**
 * Monthly collections projected ahead (D18). OLS is the default because with 12 points an
 * interpretable line with an R² is more honest than a seasonal model; Holt's smoothing is
 * offered as the "or better" alternative the UI can toggle.
 */
@Injectable()
export class ForecastService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly systemConfig: SystemConfigService,
  ) {}

  async forecast(
    model: ForecastModel,
    months: number | undefined,
    byRevenueType: boolean,
  ): Promise<ForecastResponseDto> {
    const [historyMonths, defaultHorizon] = await Promise.all([
      this.systemConfig.get(SystemConfigKey.FORECAST_HISTORY_MONTHS),
      this.systemConfig.get(SystemConfigKey.FORECAST_HORIZON_MONTHS),
    ]);
    const horizon = months ?? defaultHorizon;
    const periods = this.lastFullPeriods(historyMonths);
    const first = periods[0] ?? '';
    const last = periods[periods.length - 1] ?? '';
    const rows = await this.prisma.dailyCollectionSummary.findMany({
      where: { date: { gte: new Date(`${first}-01`), lt: this.monthAfter(last) } },
      select: { date: true, revenueTypeId: true, total: true },
    });
    const groups = new Map<string, Map<string, number>>();
    for (const row of rows) {
      const key = byRevenueType ? row.revenueTypeId : DASHBOARD_API.LABELS.ALL;
      const perPeriod = groups.get(key) ?? new Map<string, number>();
      const period = toPeriodKey(row.date);
      perPeriod.set(
        period,
        (perPeriod.get(period) ?? 0) + Number(toDecimal(row.total).toFixed(AMOUNT_SCALE)),
      );
      groups.set(key, perPeriod);
    }
    if (!byRevenueType && !groups.has(DASHBOARD_API.LABELS.ALL)) {
      groups.set(DASHBOARD_API.LABELS.ALL, new Map());
    }
    const labels = byRevenueType
      ? await this.typeLabels()
      : new Map([[DASHBOARD_API.LABELS.ALL, DASHBOARD_API.LABELS.ALL]]);
    const series: ForecastSeriesResponseDto[] = [];
    for (const [key, perPeriod] of groups) {
      const history: MonthlyTotal[] = periods.map((period) => ({
        period,
        total: perPeriod.get(period) ?? 0,
      }));
      const fitted = this.fit(model, history, horizon);
      if (fitted === null) {
        throw new AppException(
          ErrorCode.INSUFFICIENT_HISTORY,
          DASHBOARD_MESSAGES.INSUFFICIENT_HISTORY,
          HttpStatus.UNPROCESSABLE_ENTITY,
          { points: history.length },
        );
      }
      series.push({
        model,
        key,
        label: labels.get(key) ?? key,
        points: [
          ...fitted.history.map((p) => ({
            period: p.period,
            total: toDecimal(p.total).toFixed(AMOUNT_SCALE),
            forecast: false,
          })),
          ...fitted.projected.map((p) => ({
            period: p.period,
            total: toDecimal(p.total).toFixed(AMOUNT_SCALE),
            forecast: true,
          })),
        ],
        slope: fitted.slope,
        intercept: fitted.intercept,
        r2: fitted.r2,
        n: fitted.history.length,
        caveat:
          model === DASHBOARD.FORECAST_MODEL.HOLT
            ? DASHBOARD_MESSAGES.CAVEAT_HOLT(fitted.history.length)
            : DASHBOARD_MESSAGES.CAVEAT_OLS(
                fitted.history.length,
                (fitted.r2 ?? 0) < DASHBOARD_API.WEAK_R2,
              ),
      });
    }
    series.sort((a, b) => a.label.localeCompare(b.label));
    return { model, horizonMonths: horizon, series };
  }

  private fit(
    model: ForecastModel,
    history: readonly MonthlyTotal[],
    horizon: number,
  ): FittedForecast | null {
    return model === DASHBOARD.FORECAST_MODEL.HOLT
      ? holtForecast(history, horizon, DASHBOARD_API.HOLT.ALPHA, DASHBOARD_API.HOLT.BETA)
      : olsForecast(history, horizon);
  }

  /** The last `count` complete calendar months (the current month is excluded). */
  private lastFullPeriods(count: number): string[] {
    const now = new Date();
    const lastFull = toPeriodKey(subMonths(now, 1));
    const firstPeriod = toPeriodKey(subMonths(now, count));
    return periodsBetween(firstPeriod, lastFull);
  }

  private monthAfter(period: string): Date {
    const [year, month] = period.split('-').map(Number) as [number, number];
    return new Date(Date.UTC(year, month, 1));
  }

  private async typeLabels(): Promise<Map<string, string>> {
    const types = await this.prisma.revenueType.findMany({ select: { id: true, name: true } });
    return new Map(types.map((t) => [t.id, t.name]));
  }
}
