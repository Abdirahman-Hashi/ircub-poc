import { Module } from '@nestjs/common';

import { PayersModule } from '../payers/payers.module';
import { PaymentsModule } from '../payments/payments.module';
import { WaterModule } from '../water/water.module';

import { SelfController } from './self.controller';

@Module({
  imports: [PayersModule, PaymentsModule, WaterModule],
  controllers: [SelfController],
})
export class SelfModule {}
