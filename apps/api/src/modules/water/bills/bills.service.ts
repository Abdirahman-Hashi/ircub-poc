import { createReadStream } from 'node:fs';
import { access } from 'node:fs/promises';

import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { BillStatus, ErrorCode, type Paginated } from '@ircub/shared';

import { AppException } from '../../../common/errors/app.exception';
import { normaliseControlNumber } from '../../../common/ids/ids.rules';
import { toDecimal } from '../../../common/money/money.rules';
import { parseSort, toPageSlice, toPaginated } from '../../../common/pagination/pagination.rules';
import { PrismaService } from '../../../prisma/prisma.service';
import { applyPayment, reversePayment } from '../../assessments/assessments.rules';
import { WATER_MESSAGES } from '../water.messages';
import { BILL_INCLUDE, toBillView } from '../water.view';

import { BillPdfService } from './bill-pdf.service';
import { BILLS_API } from './bills.constants';
import { isBillPayable, toBillStatus } from './bills.rules';

import type { BillPdfStream } from './bills.types';
import type { BillWithRelations } from '../water-views.types';
import type { BillFilterDto } from './dto/bill-filter.dto';
import type { BillResponseDto } from './dto/bill.response.dto';
import type { TransactionClient } from '../../../prisma/prisma.types';
import type { Bill, Prisma } from '@prisma/client';
import type { Decimal } from 'decimal.js';

/** Bills: listing, PDFs (rendered lazily), and the payment ledger shared with the assessment rules. */
@Injectable()
export class BillsService {
  private readonly logger = new Logger(BillsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: BillPdfService,
  ) {}

  async list(filter: BillFilterDto): Promise<Paginated<BillResponseDto>> {
    const where: Prisma.BillWhereInput = {
      ...(filter.cycleId === undefined ? {} : { cycleId: filter.cycleId }),
      ...(filter.accountId === undefined ? {} : { accountId: filter.accountId }),
      ...(filter.payerId === undefined ? {} : { payerId: filter.payerId }),
      ...(filter.status === undefined ? {} : { status: filter.status }),
      ...(filter.flagged === undefined ? {} : { flagged: filter.flagged }),
      ...(filter.billNumber === undefined
        ? {}
        : { billNumber: normaliseControlNumber(filter.billNumber) }),
    };
    const sort = parseSort(filter.sort, BILLS_API.SORTABLE, {
      field: 'createdAt',
      direction: 'desc',
    });
    const { skip, take } = toPageSlice(filter.page, filter.pageSize);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.bill.findMany({
        where,
        skip,
        take,
        orderBy: { [sort.field]: sort.direction },
        include: BILL_INCLUDE,
      }),
      this.prisma.bill.count({ where }),
    ]);
    return toPaginated(rows.map(toBillView), total, filter.page, filter.pageSize);
  }

  async get(id: string): Promise<BillResponseDto> {
    return toBillView(await this.findOrThrow(id));
  }

  async findByBillNumber(billNumber: string): Promise<BillWithRelations | null> {
    return this.prisma.bill.findUnique({
      where: { billNumber: normaliseControlNumber(billNumber) },
      include: BILL_INCLUDE,
    });
  }

  /** Renders on first request (seeded cycles are released without files) and returns a stream. */
  async pdfStream(id: string, scopePayerId?: string): Promise<BillPdfStream> {
    const bill = await this.findOrThrow(id);
    if (scopePayerId !== undefined && bill.payerId !== scopePayerId) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        WATER_MESSAGES.BILL_NOT_FOUND,
        HttpStatus.FORBIDDEN,
        { id },
      );
    }
    if (bill.status === BillStatus.DRAFT || bill.status === BillStatus.FLAGGED) {
      throw new AppException(
        ErrorCode.PDF_NOT_AVAILABLE,
        WATER_MESSAGES.PDF_NOT_AVAILABLE,
        HttpStatus.CONFLICT,
        { status: bill.status },
      );
    }
    const relative = await this.ensurePdf(bill.id);
    return {
      fileName: `${bill.billNumber}.pdf`,
      stream: createReadStream(this.pdf.absolutePath(relative)),
    };
  }

  async ensurePdf(id: string): Promise<string> {
    const bill = await this.findOrThrow(id);
    if (bill.pdfPath !== null) {
      try {
        await access(this.pdf.absolutePath(bill.pdfPath));
        return bill.pdfPath;
      } catch {
        this.logger.warn({ msg: 'bill pdf missing on disk; re-rendering', billId: id });
      }
    }
    const relative = await this.pdf.render(bill);
    await this.prisma.bill.update({ where: { id }, data: { pdfPath: relative } });
    return relative;
  }

  /** Same ledger rules as assessments (`applyPayment`), mapped onto bill statuses; row locked. */
  async applyPayment(tx: TransactionClient, billId: string, localAmount: Decimal): Promise<Bill> {
    const current = await this.lockForUpdate(tx, billId);
    if (!isBillPayable(current.status)) {
      throw new AppException(
        ErrorCode.BILL_NOT_PAYABLE,
        WATER_MESSAGES.BILL_NOT_PAYABLE,
        HttpStatus.CONFLICT,
        { billId, status: current.status },
      );
    }
    const result = applyPayment(
      {
        amount: toDecimal(current.totalDue),
        paidAmount: toDecimal(current.paidAmount),
        status: 'PENDING',
      },
      localAmount,
    );
    if (!result.ok) {
      throw new AppException(
        ErrorCode.OVERPAYMENT,
        WATER_MESSAGES.OVERPAYMENT,
        HttpStatus.UNPROCESSABLE_ENTITY,
        {
          billId,
          outstanding: result.outstanding.toFixed(),
          attempted: localAmount.toFixed(),
        },
      );
    }
    return tx.bill.update({
      where: { id: billId },
      data: { paidAmount: result.paidAmount.toFixed(), status: toBillStatus(result.status) },
    });
  }

  async reversePayment(tx: TransactionClient, billId: string, localAmount: Decimal): Promise<Bill> {
    const current = await this.lockForUpdate(tx, billId);
    const next = reversePayment(
      {
        amount: toDecimal(current.totalDue),
        paidAmount: toDecimal(current.paidAmount),
        status: 'PENDING',
      },
      localAmount,
    );
    return tx.bill.update({
      where: { id: billId },
      data: { paidAmount: next.paidAmount.toFixed(), status: toBillStatus(next.status) },
    });
  }

  private async lockForUpdate(tx: TransactionClient, id: string): Promise<Bill> {
    await tx.$queryRaw`SELECT id FROM bill WHERE id = ${id}::uuid FOR UPDATE`;
    const row = await tx.bill.findUnique({ where: { id } });
    if (row === null) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        WATER_MESSAGES.BILL_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        { id },
      );
    }
    return row;
  }

  async findOrThrow(id: string): Promise<BillWithRelations> {
    const row = await this.prisma.bill.findUnique({ where: { id }, include: BILL_INCLUDE });
    if (row === null) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        WATER_MESSAGES.BILL_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        { id },
      );
    }
    return row;
  }
}
