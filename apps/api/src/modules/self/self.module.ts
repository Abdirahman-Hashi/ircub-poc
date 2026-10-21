import { Module } from '@nestjs/common';

import { PayersModule } from '../payers/payers.module';

import { SelfController } from './self.controller';

@Module({
  imports: [PayersModule],
  controllers: [SelfController],
})
export class SelfModule {}
