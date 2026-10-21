import { Module } from '@nestjs/common';

import { AssessmentsModule } from '../assessments/assessments.module';
import { PayersModule } from '../payers/payers.module';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [AssessmentsModule, PayersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
