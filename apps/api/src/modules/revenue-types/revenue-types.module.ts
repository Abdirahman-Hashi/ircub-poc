import { Module } from '@nestjs/common';

import { RevenueTypesController } from './revenue-types.controller';
import { RevenueTypesService } from './revenue-types.service';

@Module({
  controllers: [RevenueTypesController],
  providers: [RevenueTypesService],
  exports: [RevenueTypesService],
})
export class RevenueTypesModule {}
