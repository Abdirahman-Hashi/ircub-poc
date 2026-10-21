import { Controller, Get, HttpStatus, Query, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { FX, PATHS } from '../mocks.constants';

import { RatesQueryDto } from './dto/rates-query.dto';
import { RatesResponseDto } from './dto/rates.response.dto';
import { RatesService } from './rates.service';

@ApiTags('fx')
@Controller(PATHS.RATES)
export class RatesController {
  constructor(private readonly rates: RatesService) {}

  @Get()
  @ApiOperation({ summary: 'Current FX rates against a base currency (drifts ±0.5% per call)' })
  @ApiResponse({ status: HttpStatus.OK, type: RatesResponseDto })
  @ApiResponse({ status: HttpStatus.SERVICE_UNAVAILABLE, description: 'Forced with ?fail=1' })
  get(@Query() query: RatesQueryDto): RatesResponseDto {
    if (query.fail === FX.FAIL_FLAG) {
      throw new ServiceUnavailableException('FX provider unavailable (forced by ?fail=1)');
    }
    return this.rates.quote(query.base);
  }
}
