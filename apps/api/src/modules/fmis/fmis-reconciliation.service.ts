import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { ErrorCode, JournalBatchStatus } from '@ircub/shared';
import type { FmisLedgerEntry } from '@ircub/shared';

import { csvLine } from '../../common/csv/csv.rules';
import { AppException } from '../../common/errors/app.exception';
import { PrismaService } from '../../prisma/prisma.service';

import { FMIS_API, FMIS_CLIENT } from './fmis.constants';
import { FMIS_MESSAGES } from './fmis.messages';
import { daysBetween, netCreditByGl, netCreditFromLedger, reconcile } from './fmis.rules';
import { LINE_INCLUDE, toLineView } from './fmis.view';

import type { FmisReconciliationDrilldownResponseDto } from './dto/fmis-reconciliation-drilldown.response.dto';
import type { FmisReconciliationRowResponseDto } from './dto/fmis-reconciliation-row.response.dto';
import type { CachedLedger, FmisClient } from './fmis.types';

/**
 * IRCUB posted totals vs the FMIS ledger per day and GL (brief Module 6; D17). Totals are net
 * credits (revenue GLs positive, the cash control GL negative) so one figure compares both
 * sides. Ledger responses are cached for 60 s.
 */
@Injectable()
export class FmisReconciliationService {
  private readonly ledgerCache = new Map<string, CachedLedger>();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(FMIS_CLIENT) private readonly fmis: FmisClient,
  ) {}

  async rows(from: string, to: string): Promise<FmisReconciliationRowResponseDto[]> {
    if (from > to) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        FMIS_MESSAGES.RANGE_INVERTED,
        HttpStatus.BAD_REQUEST,
        { from, to },
      );
    }
    const days = daysBetween(from, to);
    if (days.length > FMIS_API.MAX_RECONCILIATION_DAYS) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        FMIS_MESSAGES.RANGE_TOO_LONG,
        HttpStatus.BAD_REQUEST,
        { from, to, maxDays: FMIS_API.MAX_RECONCILIATION_DAYS },
      );
    }
    const glNames = await this.glNames();
    const rows: FmisReconciliationRowResponseDto[] = [];
    for (const day of days) {
      const ircub = netCreditByGl(await this.postedLines(day));
      const fmis = netCreditFromLedger(await this.ledger(day));
      const codes = [...new Set([...ircub.keys(), ...fmis.keys()])].sort();
      for (const glCode of codes) {
        const ircubTotal = ircub.get(glCode) ?? FMIS_API.ZERO;
        const fmisTotal = fmis.get(glCode);
        const verdict = reconcile(ircubTotal, fmisTotal);
        rows.push({
          date: day,
          glCode,
          glName: glNames.get(glCode) ?? null,
          ircubTotal,
          fmisTotal: fmisTotal ?? FMIS_API.ZERO,
          ...verdict,
        });
      }
    }
    return rows;
  }

  async drilldown(date: string, glCode: string): Promise<FmisReconciliationDrilldownResponseDto> {
    const lines = await this.prisma.journalLine.findMany({
      where: {
        OR: [{ creditGl: glCode }, { debitGl: glCode }],
        batch: {
          batchDate: new Date(date),
          status: { in: [JournalBatchStatus.POSTED, JournalBatchStatus.REVERSED] },
        },
      },
      orderBy: { reference: 'asc' },
      include: LINE_INCLUDE,
    });
    return { date, glCode, lines: lines.map(toLineView) };
  }

  async exportCsv(from: string, to: string): Promise<string> {
    const rows = await this.rows(from, to);
    const lines = rows.map((row) =>
      csvLine([
        row.date,
        row.glCode,
        row.glName,
        row.ircubTotal,
        row.fmisTotal,
        row.difference,
        row.status,
      ]),
    );
    return `${[csvLine(FMIS_API.EXPORT_COLUMNS), ...lines].join('\n')}\n`;
  }

  private async postedLines(date: string) {
    return this.prisma.journalLine.findMany({
      where: {
        batch: {
          batchDate: new Date(date),
          status: { in: [JournalBatchStatus.POSTED, JournalBatchStatus.REVERSED] },
        },
      },
      select: { debitGl: true, creditGl: true, amount: true, currency: true, reference: true },
    });
  }

  private async ledger(date: string): Promise<readonly FmisLedgerEntry[]> {
    const cached = this.ledgerCache.get(date);
    if (cached !== undefined && cached.expiresAt > Date.now()) {
      return cached.entries;
    }
    const response = await this.fmis.ledger(date);
    this.ledgerCache.set(date, {
      entries: response.entries,
      expiresAt: Date.now() + FMIS_API.LEDGER_CACHE_MS,
    });
    return response.entries;
  }

  /** Latest name per GL code across mappings, for display only. */
  private async glNames(): Promise<Map<string, string>> {
    const mappings = await this.prisma.glMapping.findMany({
      orderBy: { effectiveFrom: 'asc' },
      select: { glCode: true, glName: true },
    });
    return new Map(mappings.map((mapping) => [mapping.glCode, mapping.glName]));
  }
}
