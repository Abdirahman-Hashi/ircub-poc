import { Global, Module } from '@nestjs/common';

import { CsvModule } from '../../common/csv/csv.module';

import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { ForecastService } from './forecast.service';
import { SummaryService } from './summary.service';
import { TargetsController } from './targets.controller';
import { TargetsService } from './targets.service';

/** Global so payments, reversals and billing can mark summaries dirty. */
@Global()
@Module({
  imports: [CsvModule],
  controllers: [DashboardController, TargetsController],
  providers: [SummaryService, DashboardService, ForecastService, TargetsService],
  exports: [SummaryService],
})
export class DashboardModule {}
