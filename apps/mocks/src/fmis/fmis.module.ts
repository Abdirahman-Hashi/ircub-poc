import { Module } from '@nestjs/common';

import { StoreModule } from '../store/store.module';

import { FmisController } from './fmis.controller';
import { FmisService } from './fmis.service';

@Module({
  imports: [StoreModule],
  controllers: [FmisController],
  providers: [FmisService],
})
export class FmisModule {}
