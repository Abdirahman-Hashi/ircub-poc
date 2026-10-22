import { Module } from '@nestjs/common';

import { FmisPosterService } from './fmis-poster.service';
import { FMIS_CLIENT } from './fmis.constants';
import { GlMappingsController } from './gl-mappings.controller';
import { GlMappingsService } from './gl-mappings.service';
import { HttpFmisClient } from './http-fmis.client';
import { JournalBatchService } from './journal-batch.service';

@Module({
  controllers: [GlMappingsController],
  providers: [
    { provide: FMIS_CLIENT, useClass: HttpFmisClient },
    GlMappingsService,
    JournalBatchService,
    FmisPosterService,
  ],
  exports: [JournalBatchService, GlMappingsService],
})
export class FmisModule {}
