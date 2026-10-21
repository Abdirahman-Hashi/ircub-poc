import { Module } from '@nestjs/common';

import { PayersModule } from '../payers/payers.module';
import { RevenueTypesModule } from '../revenue-types/revenue-types.module';

import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';

@Module({
  imports: [PayersModule, RevenueTypesModule],
  controllers: [AssessmentsController],
  providers: [AssessmentsService],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}
