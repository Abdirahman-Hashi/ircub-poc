import { Module } from '@nestjs/common';

import { GlMappingsController } from './gl-mappings.controller';
import { GlMappingsService } from './gl-mappings.service';
import { JournalBatchService } from './journal-batch.service';

@Module({
  controllers: [GlMappingsController],
  providers: [GlMappingsService, JournalBatchService],
  exports: [JournalBatchService, GlMappingsService],
})
export class FmisModule {}
