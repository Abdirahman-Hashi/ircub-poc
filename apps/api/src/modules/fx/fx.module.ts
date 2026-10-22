import { Global, Module } from '@nestjs/common';

import { FX_RATE_PROVIDER } from './fx.constants';
import { FxController } from './fx.controller';
import { FxService } from './fx.service';
import { HttpFxRateProvider } from './http-fx-rate.provider';

@Global()
@Module({
  controllers: [FxController],
  providers: [FxService, { provide: FX_RATE_PROVIDER, useClass: HttpFxRateProvider }],
  exports: [FxService],
})
export class FxModule {}
