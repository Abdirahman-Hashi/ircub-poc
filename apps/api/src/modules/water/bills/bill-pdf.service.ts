import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';

import { AppConfigService } from '../../../config/app-config.service';
import { WATER } from '../water.constants';

import { BILL_PDF } from './bills.constants';

import type { BillWithRelations } from '../water-views.types';

/** Renders a bill to `STORAGE_DIR/bills/<billNumber>.pdf` with pdfkit (D19). */
@Injectable()
export class BillPdfService {
  private readonly logger = new Logger(BillPdfService.name);

  constructor(private readonly config: AppConfigService) {}

  relativePath(billNumber: string): string {
    return join(WATER.BILLS_DIR, `${billNumber}${WATER.PDF_EXTENSION}`);
  }

  absolutePath(relative: string): string {
    return join(this.config.storageDir, relative);
  }

  async render(bill: BillWithRelations): Promise<string> {
    const relative = this.relativePath(bill.billNumber);
    const absolute = this.absolutePath(relative);
    await mkdir(join(this.config.storageDir, WATER.BILLS_DIR), { recursive: true });

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ margin: BILL_PDF.MARGIN });
      const stream = createWriteStream(absolute);
      stream.on('finish', () => {
        resolve();
      });
      stream.on('error', reject);
      doc.pipe(stream);

      const money = (value: { toFixed(): string } | string): string =>
        `${bill.currency} ${typeof value === 'string' ? value : value.toFixed()}`;
      const breakdown = bill.tierBreakdown as {
        from: number;
        to: number | null;
        units: number;
        rate: string;
        amount: string;
      }[];

      doc.fontSize(BILL_PDF.FONT_TITLE).text(BILL_PDF.TITLE);
      doc.fontSize(BILL_PDF.FONT_BODY).text(`Bill number (control number): ${bill.billNumber}`);
      doc.text(
        `Period: ${bill.cycle.period}    Due: ${bill.dueDate.toISOString().slice(0, 'YYYY-MM-DD'.length)}`,
      );
      doc.moveDown();

      doc.text(`Customer: ${bill.payer.name} (${bill.payer.tin})`);
      doc.text(`Account: ${bill.account.accountNumber}`);
      doc.text(`Service address: ${bill.account.serviceAddress}`);
      doc.moveDown();

      doc.text(
        `Previous reading: ${bill.previousReading}    Current reading: ${bill.currentReading}    Consumption: ${bill.consumption} units`,
      );
      doc.moveDown(BILL_PDF.LINE_GAP / BILL_PDF.FONT_BODY);

      doc.text('Tier breakdown');
      for (const line of breakdown) {
        const band = line.to === null ? `${line.from}+` : `${line.from}–${line.to}`;
        doc
          .text(`  ${band} units: ${line.units} × ${line.rate}`, { continued: true })
          .text(money(line.amount), { align: 'right' });
      }
      doc.moveDown();
      doc
        .text('Consumption charge', { continued: true })
        .text(money(bill.consumptionCharge), { align: 'right' });
      doc
        .text('Fixed service charge', { continued: true })
        .text(money(bill.fixedCharge), { align: 'right' });
      doc
        .text('Arrears brought forward', { continued: true })
        .text(money(bill.arrears), { align: 'right' });
      doc
        .text('Payments applied', { continued: true })
        .text(money(bill.paymentsApplied), { align: 'right' });
      doc
        .fontSize(BILL_PDF.FONT_TITLE - BILL_PDF.LINE_GAP)
        .text('TOTAL DUE', { continued: true })
        .text(money(bill.totalDue), { align: 'right' });
      doc.moveDown();
      doc
        .fontSize(BILL_PDF.FONT_SMALL)
        .text(
          `Pay at any bank, mobile money agent or revenue office quoting control number ${bill.billNumber}.`,
        );
      doc.end();
    });

    this.logger.log({ msg: 'bill pdf rendered', billId: bill.id, path: relative });
    return relative;
  }
}
