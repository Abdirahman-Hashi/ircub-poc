import { HttpStatus, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { subDays } from 'date-fns';

import { ErrorCode } from '@ircub/shared';

import { AppException } from '../../common/errors/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { toDateKey, daysBetween } from '../fmis/fmis.rules';

import { DASHBOARD_API } from './dashboard.constants';
import { DASHBOARD_MESSAGES } from './dashboard.messages';
import { rebuildDailySummaries } from './summary.rebuild';

/**
 * Keeps the pre-aggregated summaries fresh (D18): hourly for the last two days, on demand
 * for any range, and within five seconds of a payment, reversal or billing change through
 * `markDirty(day)` (debounced per day so a bulk upload rebuilds once).
 */
@Injectable()
export class SummaryService implements OnModuleDestroy {
  private readonly logger = new Logger(SummaryService.name);
  private readonly dirty = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private readonly prisma: PrismaService) {}

  @Cron(DASHBOARD_API.SUMMARY_CRON)
  async rebuildRecent(): Promise<void> {
    const to = toDateKey(new Date());
    const from = toDateKey(subDays(new Date(), DASHBOARD_API.REBUILD_RECENT_DAYS - 1));
    await this.rebuild(from, to);
  }

  async rebuild(from: string, to: string): Promise<number> {
    if (from > to) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        DASHBOARD_MESSAGES.RANGE_INVERTED,
        HttpStatus.BAD_REQUEST,
        { from, to },
      );
    }
    if (daysBetween(from, to).length > DASHBOARD_API.MAX_RANGE_DAYS) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        DASHBOARD_MESSAGES.RANGE_TOO_LONG,
        HttpStatus.BAD_REQUEST,
        { from, to },
      );
    }
    const rows = await rebuildDailySummaries(this.prisma, from, to);
    this.logger.log({ msg: 'summaries rebuilt', from, to, rows });
    return rows;
  }

  /** A business change touched this day; rebuild it once the burst settles. */
  markDirty(date: Date): void {
    const day = toDateKey(date);
    const pending = this.dirty.get(day);
    if (pending !== undefined) {
      clearTimeout(pending);
    }
    this.dirty.set(
      day,
      setTimeout(() => {
        this.dirty.delete(day);
        this.rebuild(day, day).catch((error: unknown) => {
          this.logger.error(
            { msg: 'dirty-day rebuild failed', day },
            error instanceof Error ? error.stack : String(error),
          );
        });
      }, DASHBOARD_API.DIRTY_DEBOUNCE_MS),
    );
  }

  onModuleDestroy(): void {
    for (const timer of this.dirty.values()) {
      clearTimeout(timer);
    }
    this.dirty.clear();
  }
}
