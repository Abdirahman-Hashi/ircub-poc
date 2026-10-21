import { Body, Controller, Get, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { PERMISSIONS } from '@ircub/shared';

import { SWAGGER } from '../../../app.constants';
import { RequirePermission } from '../../../common/auth/require-permission.decorator';

import { InstallMeterDto } from './dto/install-meter.dto';
import { MeterResponseDto } from './dto/meter.response.dto';
import { ReplaceMeterDto } from './dto/replace-meter.dto';
import { METERS_API } from './meters.constants';
import { MetersService } from './meters.service';

@ApiTags('water')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(METERS_API.PATH)
export class MetersController {
  constructor(private readonly meters: MetersService) {}

  @Get(':id')
  @RequirePermission(PERMISSIONS.BILLS_VIEW)
  @ApiResponse({ status: HttpStatus.OK, type: MeterResponseDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<MeterResponseDto> {
    return this.meters.get(id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.PAYERS_REGISTER)
  @ApiOperation({ summary: 'Install a meter on an account' })
  @ApiResponse({ status: HttpStatus.CREATED, type: MeterResponseDto })
  install(@Body() dto: InstallMeterDto): Promise<MeterResponseDto> {
    return this.meters.install(dto);
  }

  @Post(`:id/${METERS_API.REPLACE}`)
  @RequirePermission(PERMISSIONS.PAYERS_REGISTER)
  @ApiOperation({
    summary: 'Replace a meter: old → REPLACED, new meter linked via replacesMeterId',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: MeterResponseDto })
  replace(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceMeterDto,
  ): Promise<MeterResponseDto> {
    return this.meters.replace(id, dto);
  }
}
