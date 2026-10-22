import { Global, Module } from '@nestjs/common';

import { CsvModule } from '../../common/csv/csv.module';

import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { ForecastService } from './forecast.service';
import { SummaryService } from './summary.service';
import { TargetsController } from './targets.controller';
import { TargetsService } from './targets.service';

/** Global so payments, reversals, billing and FMIS can mark summaries dirty and raise alerts. */
@Global()
@Module({
  imports: [CsvModule],
  controllers: [DashboardController, AlertsController, TargetsController],
  providers: [SummaryService, DashboardService, ForecastService, AlertsService, TargetsService],
  exports: [SummaryService, AlertsService],
})
export class DashboardModule {}
