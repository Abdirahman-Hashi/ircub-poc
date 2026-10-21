import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { PERMISSIONS } from '@ircub/shared';

import { SWAGGER } from '../../app.constants';
import { RequirePermission } from '../../common/auth/require-permission.decorator';

import { FxPairQueryDto } from './dto/fx-pair-query.dto';
import { FxRateResponseDto } from './dto/fx-rate.response.dto';
import { FX_API } from './fx.constants';
import { FxService } from './fx.service';

@ApiTags('fx')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(FX_API.PATH)
@RequirePermission(PERMISSIONS.FX_VIEW)
export class FxController {
  constructor(private readonly fx: FxService) {}

  @Get(FX_API.LATEST)
  @ApiOperation({ summary: 'Latest stored rate for a pair' })
  @ApiResponse({ status: HttpStatus.OK, type: FxRateResponseDto })
  async latest(@Query() query: FxPairQueryDto): Promise<FxRateResponseDto> {
    const rate = await this.fx.latestRate(query.base, query.quote);
    return {
      base: rate.base,
      quote: rate.quote,
      rate: rate.rate.toFixed(),
      asOf: rate.asOf,
      source: rate.source,
    };
  }

  @Get(FX_API.HISTORY)
  @ApiOperation({ summary: 'Recent stored rates for a pair (newest first)' })
  @ApiResponse({ status: HttpStatus.OK, type: [FxRateResponseDto] })
  history(@Query() query: FxPairQueryDto): Promise<FxRateResponseDto[]> {
    return this.fx.history(query.base, query.quote);
  }
}
