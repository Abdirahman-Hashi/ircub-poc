import { Module } from '@nestjs/common';

import { AssessmentsModule } from '../assessments/assessments.module';
import { PayersModule } from '../payers/payers.module';
import { WaterModule } from '../water/water.module';

import { PaymentCallbackController } from './payment-callback.controller';
import { PaymentInitiationService } from './payment-initiation.service';
import { PaymentSettlementService } from './payment-settlement.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [AssessmentsModule, PayersModule, WaterModule],
  controllers: [PaymentsController, PaymentCallbackController],
  providers: [PaymentsService, PaymentInitiationService, PaymentSettlementService],
  exports: [PaymentsService, PaymentInitiationService, PaymentSettlementService],
})
export class PaymentsModule {}
