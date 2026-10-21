import { Module } from '@nestjs/common';

import { PayersModule } from '../payers/payers.module';
import { WaterModule } from '../water/water.module';

import { SelfController } from './self.controller';

@Module({
  imports: [PayersModule, WaterModule],
  controllers: [SelfController],
})
export class SelfModule {}
