import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { PERMISSIONS } from '@ircub/shared';

import { SWAGGER } from '../../../app.constants';
import { RequirePermission } from '../../../common/auth/require-permission.decorator';
import { RevenueTypeFilterDto } from '../../revenue-types/dto/revenue-type-filter.dto';

import { CreateTariffCategoryDto } from './dto/create-tariff-category.dto';
import { TariffCategoryResponseDto } from './dto/tariff-category.response.dto';
import { UpdateTariffCategoryDto } from './dto/update-tariff-category.dto';
import { TARIFFS_API } from './tariffs.constants';
import { TariffsService } from './tariffs.service';

@ApiTags('water')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(TARIFFS_API.PATH)
export class TariffsController {
  constructor(private readonly tariffs: TariffsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.BILLS_VIEW)
  @ApiOperation({ summary: 'Tariff categories with their tiers' })
  @ApiResponse({ status: HttpStatus.OK, type: [TariffCategoryResponseDto] })
  list(@Query() filter: RevenueTypeFilterDto): Promise<TariffCategoryResponseDto[]> {
    return this.tariffs.list(filter.includeInactive === true);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.BILLS_VIEW)
  @ApiResponse({ status: HttpStatus.OK, type: TariffCategoryResponseDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<TariffCategoryResponseDto> {
    return this.tariffs.get(id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.CONFIG_MANAGE)
  @ApiOperation({
    summary: 'Create a tariff category; tiers must start at 0, be contiguous and end open-ended',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: TariffCategoryResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'TARIFF_TIERS_INVALID' })
  create(@Body() dto: CreateTariffCategoryDto): Promise<TariffCategoryResponseDto> {
    return this.tariffs.create(dto);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.CONFIG_MANAGE)
  @ApiOperation({ summary: 'Edit name, fixed charge, active flag or replace the tier set' })
  @ApiResponse({ status: HttpStatus.OK, type: TariffCategoryResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTariffCategoryDto,
  ): Promise<TariffCategoryResponseDto> {
    return this.tariffs.update(id, dto);
  }
}
