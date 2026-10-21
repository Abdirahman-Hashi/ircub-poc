import { Module } from '@nestjs/common';

import { SodController } from './sod.controller';
import { SodService } from './sod.service';

@Module({
  controllers: [SodController],
  providers: [SodService],
  exports: [SodService],
})
export class SodModule {}
