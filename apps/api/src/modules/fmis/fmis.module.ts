import { Module } from '@nestjs/common';

import { GlMappingsController } from './gl-mappings.controller';
import { GlMappingsService } from './gl-mappings.service';

@Module({
  controllers: [GlMappingsController],
  providers: [GlMappingsService],
  exports: [GlMappingsService],
})
export class FmisModule {}
