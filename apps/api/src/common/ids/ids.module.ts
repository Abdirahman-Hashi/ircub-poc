import { Global, Module } from '@nestjs/common';

import { IdsService } from './ids.service';

@Global()
@Module({
  providers: [IdsService],
  exports: [IdsService],
})
export class IdsModule {}
