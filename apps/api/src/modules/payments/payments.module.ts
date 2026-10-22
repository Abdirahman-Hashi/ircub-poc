import { Module } from '@nestjs/common';

import { AssessmentsModule } from '../assessments/assessments.module';
import { PayersModule } from '../payers/payers.module';
import { WaterModule } from '../water/water.module';

import { PaymentInitiationService } from './payment-initiation.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [AssessmentsModule, PayersModule, WaterModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentInitiationService],
  exports: [PaymentsService, PaymentInitiationService],
})
export class PaymentsModule {}
