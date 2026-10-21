import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { type Paginated, PERMISSIONS } from '@ircub/shared';

import { SWAGGER } from '../../../app.constants';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { RequirePermission } from '../../../common/auth/require-permission.decorator';

import { CreateReadingDto } from './dto/create-reading.dto';
import { MeterReadingResponseDto } from './dto/meter-reading.response.dto';
import { ReadingFilterDto } from './dto/reading-filter.dto';
import { ReadingPreviewResponseDto } from './dto/reading-preview.response.dto';
import { READINGS_API } from './readings.constants';
import { ReadingsService } from './readings.service';

import type { AuthenticatedUser } from '../../../common/auth/auth.types';

@ApiTags('water')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(READINGS_API.PATH)
export class ReadingsController {
  constructor(private readonly readings: ReadingsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.BILLS_VIEW)
  @ApiOperation({ summary: 'Readings with filters (account, meter, dates, abnormal, source)' })
  @ApiResponse({ status: HttpStatus.OK, type: [MeterReadingResponseDto] })
  list(@Query() filter: ReadingFilterDto): Promise<Paginated<MeterReadingResponseDto>> {
    return this.readings.list(filter);
  }

  @Post(READINGS_API.PREVIEW)
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.METERS_READ)
  @ApiOperation({ summary: 'Compute consumption and the abnormal flag without saving' })
  @ApiResponse({ status: HttpStatus.OK, type: ReadingPreviewResponseDto })
  preview(@Body() dto: CreateReadingDto): Promise<ReadingPreviewResponseDto> {
    return this.readings.preview(dto);
  }

  @Post()
  @RequirePermission(PERMISSIONS.METERS_READ)
  @ApiOperation({
    summary: 'Capture a reading (NORMAL / ROLLOVER / REPLACEMENT rules, abnormal detection)',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: MeterReadingResponseDto })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'READING_BELOW_PREVIOUS' })
  create(
    @Body() dto: CreateReadingDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<MeterReadingResponseDto> {
    return this.readings.create(dto, actor.id);
  }
}
