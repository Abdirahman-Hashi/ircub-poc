import { Injectable, Logger } from '@nestjs/common';

import type { Currency } from '@ircub/shared';

import { FX } from '../mocks.constants';

import { driftRates, rebase } from './rates.rules';

import type { RatesResponseDto } from './dto/rates.response.dto';

@Injectable()
export class RatesService {
  private readonly logger = new Logger(RatesService.name);

  quote(base: Currency = FX.DEFAULT_BASE): RatesResponseDto {
    const drifted = driftRates(FX.DEFAULT_BASE, FX.BASE_RATES, FX.DRIFT_PCT, Math.random);
    const rates = base === FX.DEFAULT_BASE ? drifted : rebase(drifted, base);
    const asOf = new Date().toISOString();
    this.logger.log({ msg: 'rates quoted', base, rates, asOf });
    return { base, rates, asOf };
  }
}
