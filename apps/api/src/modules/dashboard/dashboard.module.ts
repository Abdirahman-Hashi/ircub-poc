import { Global, Module } from '@nestjs/common';

import { SummaryService } from './summary.service';

/** Global so payments, reversals and billing can mark summaries dirty. */
@Global()
@Module({
  providers: [SummaryService],
  exports: [SummaryService],
})
export class DashboardModule {}
