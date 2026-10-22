import { Module } from '@nestjs/common';

import { AssessmentsModule } from '../assessments/assessments.module';
import { FmisModule } from '../fmis/fmis.module';
import { PaymentsModule } from '../payments/payments.module';
import { WaterModule } from '../water/water.module';

import { ReversalsController } from './reversals.controller';
import { ReversalsService } from './reversals.service';

@Module({
  imports: [PaymentsModule, AssessmentsModule, WaterModule, FmisModule],
  controllers: [ReversalsController],
  providers: [ReversalsService],
  exports: [ReversalsService],
})
export class ReversalsModule {}
