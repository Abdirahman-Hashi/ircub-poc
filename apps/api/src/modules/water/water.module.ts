import { Module } from '@nestjs/common';

import { PayersModule } from '../payers/payers.module';

import { AccountsController } from './accounts/accounts.controller';
import { AccountsService } from './accounts/accounts.service';
import { BillingJobsService } from './billing/billing-jobs.service';
import { BillingController } from './billing/billing.controller';
import { BillingService } from './billing/billing.service';
import { BillPdfService } from './bills/bill-pdf.service';
import { BillsController } from './bills/bills.controller';
import { BillsService } from './bills/bills.service';
import { MetersController } from './meters/meters.controller';
import { MetersService } from './meters/meters.service';
import { ReadingsImportService } from './readings/readings-import.service';
import { ReadingsUploadController } from './readings/readings-upload.controller';
import { ReadingsController } from './readings/readings.controller';
import { ReadingsService } from './readings/readings.service';
import { StatementsController } from './statements/statements.controller';
import { StatementsService } from './statements/statements.service';
import { TariffsController } from './tariffs/tariffs.controller';
import { TariffsService } from './tariffs/tariffs.service';

/** Water utility billing (brief Module 4): tariffs, accounts, meters, readings, cycles, bills, statements. */
@Module({
  imports: [PayersModule],
  controllers: [
    TariffsController,
    AccountsController,
    MetersController,
    ReadingsController,
    ReadingsUploadController,
    BillingController,
    BillsController,
    StatementsController,
  ],
  providers: [
    TariffsService,
    AccountsService,
    MetersService,
    ReadingsService,
    ReadingsImportService,
    BillingService,
    BillingJobsService,
    BillPdfService,
    BillsService,
    StatementsService,
  ],
  exports: [AccountsService, BillsService, StatementsService],
})
export class WaterModule {}
