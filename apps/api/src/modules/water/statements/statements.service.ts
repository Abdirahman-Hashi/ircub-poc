import { HttpStatus, Injectable } from '@nestjs/common';
import { endOfDay, startOfDay, subMonths } from 'date-fns';
import PDFDocument from 'pdfkit';

import { BillStatus, ErrorCode, PaymentStatus } from '@ircub/shared';

import { AppException } from '../../../common/errors/app.exception';
import { PrismaService } from '../../../prisma/prisma.service';
import { SystemConfigKey } from '../../system-config/system-config.keys';
import { SystemConfigService } from '../../system-config/system-config.service';
import { AccountsService } from '../accounts/accounts.service';
import { WATER_MESSAGES } from '../water.messages';

import { STATEMENTS } from './statements.constants';
import { buildStatement } from './statements.rules';

import type { StatementResponseDto } from './dto/statement.response.dto';

/** Customer statement: bills and payments in date order with a running balance (brief Module 4). */
@Injectable()
export class StatementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
    private readonly systemConfig: SystemConfigService,
  ) {}

  async build(
    accountId: string,
    from: Date | undefined,
    to: Date | undefined,
    scopePayerId?: string,
  ): Promise<StatementResponseDto> {
    const account = await this.accounts.findOrThrow(accountId);
    if (scopePayerId !== undefined && account.payerId !== scopePayerId) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        WATER_MESSAGES.ACCOUNT_NOT_FOUND,
        HttpStatus.FORBIDDEN,
        { accountId },
      );
    }
    const rangeTo = endOfDay(to ?? new Date());
    const rangeFrom = startOfDay(from ?? subMonths(rangeTo, STATEMENTS.DEFAULT_MONTHS));
    if (rangeFrom.getTime() > rangeTo.getTime()) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        WATER_MESSAGES.STATEMENT_RANGE,
        HttpStatus.BAD_REQUEST,
        { from, to },
      );
    }
    const [bills, payments, currency] = await Promise.all([
      this.prisma.bill.findMany({
        where: {
          accountId,
          status: { in: [BillStatus.RELEASED, BillStatus.PART_PAID, BillStatus.PAID] },
          releasedAt: { not: null },
        },
        include: { cycle: { select: { period: true } } },
      }),
      this.prisma.payment.findMany({
        where: {
          bill: { accountId },
          status: { in: [PaymentStatus.CONFIRMED, PaymentStatus.REVERSED] },
        },
      }),
      this.systemConfig.get(SystemConfigKey.LOCAL_CURRENCY),
    ]);
    const statement = buildStatement(
      bills.map((bill) => ({
        billNumber: bill.billNumber,
        period: bill.cycle.period,
        releasedAt: bill.releasedAt ?? bill.createdAt,
        consumptionCharge: bill.consumptionCharge,
        fixedCharge: bill.fixedCharge,
      })),
      payments
        .filter((payment) => payment.status === PaymentStatus.CONFIRMED)
        .map((payment) => ({
          id: payment.id,
          reference: payment.channelTxnRef ?? payment.channel,
          paidAt: payment.paidAt ?? payment.createdAt,
          localAmount: payment.localAmount,
        })),
      rangeFrom,
      rangeTo,
    );
    return {
      account: {
        id: account.id,
        accountNumber: account.accountNumber,
        serviceAddress: account.serviceAddress,
      },
      payer: account.payer,
      from: rangeFrom,
      to: rangeTo,
      currency,
      openingBalance: statement.openingBalance.toFixed(),
      closingBalance: statement.closingBalance.toFixed(),
      lines: statement.lines.map((line) => ({
        ...line,
        debit: line.debit.toFixed(),
        credit: line.credit.toFixed(),
        balance: line.balance.toFixed(),
      })),
    };
  }

  /** Statement as a PDF buffer (small documents; no need to touch disk). */
  async pdf(
    accountId: string,
    from: Date | undefined,
    to: Date | undefined,
    scopePayerId?: string,
  ): Promise<Buffer> {
    const statement = await this.build(accountId, from, to, scopePayerId);
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: STATEMENTS.MARGIN });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', reject);
      const day = (value: Date | string): string =>
        new Date(value).toISOString().slice(0, 'YYYY-MM-DD'.length);
      const c = STATEMENTS.COLUMNS;

      doc.fontSize(STATEMENTS.FONT_TITLE).text(STATEMENTS.PDF_TITLE);
      doc.fontSize(STATEMENTS.FONT_BODY);
      doc.text(
        `${statement.payer.name} (${statement.payer.tin}) · Account ${statement.account.accountNumber}`,
      );
      doc.text(statement.account.serviceAddress);
      doc.text(`Period ${day(statement.from)} to ${day(statement.to)} · ${statement.currency}`);
      doc.moveDown();
      let y = doc.y;
      doc
        .text('Date', c.DATE, y)
        .text('Type', c.KIND, y)
        .text('Reference', c.REF, y)
        .text('Description', c.DESC, y)
        .text('Debit', c.DEBIT, y)
        .text('Credit', c.CREDIT, y)
        .text('Balance', c.BALANCE, y);
      for (const line of statement.lines) {
        y = doc.y;
        doc
          .text(day(line.date), c.DATE, y)
          .text(line.kind, c.KIND, y)
          .text(line.reference, c.REF, y)
          .text(line.description, c.DESC, y)
          .text(line.debit, c.DEBIT, y)
          .text(line.credit, c.CREDIT, y)
          .text(line.balance, c.BALANCE, y);
      }
      doc.moveDown();
      doc.text(`Closing balance: ${statement.currency} ${statement.closingBalance}`, c.DATE);
      doc.end();
    });
  }
}
