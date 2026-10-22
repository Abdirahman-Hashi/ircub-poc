import { Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { type Currency, PERMISSIONS } from '@ircub/shared';

import { SWAGGER } from '../../app.constants';
import { RequirePermission } from '../../common/auth/require-permission.decorator';
import { SystemConfigKey } from '../system-config/system-config.keys';
import { SystemConfigService } from '../system-config/system-config.service';

import { FxPairQueryDto } from './dto/fx-pair-query.dto';
import { FxRateResponseDto } from './dto/fx-rate.response.dto';
import { FX_API } from './fx.constants';
import { FxService } from './fx.service';

import type { StoredRate } from './fx.types';

function toView(rate: StoredRate): FxRateResponseDto {
  return {
    base: rate.base,
    quote: rate.quote,
    rate: rate.rate.toFixed(),
    asOf: rate.asOf,
    source: rate.source,
    stale: rate.stale,
  };
}

@ApiTags('fx')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(FX_API.PATH)
@RequirePermission(PERMISSIONS.FX_VIEW)
export class FxController {
  constructor(
    private readonly fx: FxService,
    private readonly systemConfig: SystemConfigService,
  ) {}

  @Get(FX_API.LATEST)
  @ApiOperation({ summary: 'Latest stored rate for a pair, with a stale flag' })
  @ApiResponse({ status: HttpStatus.OK, type: FxRateResponseDto })
  async latest(@Query() query: FxPairQueryDto): Promise<FxRateResponseDto> {
    const [base, quote] = await this.pair(query);
    return toView(await this.fx.latestRate(base, quote));
  }

  @Post(FX_API.REFRESH)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fetch a fresh quote from the provider now (falls back to stored if down)',
  })
  @ApiResponse({ status: HttpStatus.OK, type: FxRateResponseDto })
  async refresh(@Query() query: FxPairQueryDto): Promise<FxRateResponseDto> {
    const [base, quote] = await this.pair(query);
    return toView(await this.fx.getRate(base, quote));
  }

  @Get(FX_API.HISTORY)
  @ApiOperation({ summary: 'Recent stored rates for a pair (newest first)' })
  @ApiResponse({ status: HttpStatus.OK, type: [FxRateResponseDto] })
  async history(@Query() query: FxPairQueryDto): Promise<FxRateResponseDto[]> {
    const [base, quote] = await this.pair(query);
    return this.fx.history(base, quote);
  }

  private async pair(query: FxPairQueryDto): Promise<[Currency, Currency]> {
    return [
      query.base ?? FX_API.DEFAULT_BASE,
      query.quote ?? (await this.systemConfig.get(SystemConfigKey.LOCAL_CURRENCY)),
    ];
  }
}
