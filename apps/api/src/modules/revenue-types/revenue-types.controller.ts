import {
  Body,
  Controller,
  Delete,
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

import { SWAGGER } from '../../app.constants';
import { RequirePermission } from '../../common/auth/require-permission.decorator';

import { CreateRevenueTypeDto } from './dto/create-revenue-type.dto';
import { RevenueTypeFilterDto } from './dto/revenue-type-filter.dto';
import { RevenueTypeResponseDto } from './dto/revenue-type.response.dto';
import { UpdateRevenueTypeDto } from './dto/update-revenue-type.dto';
import { REVENUE_TYPES_API } from './revenue-types.constants';
import { RevenueTypesService } from './revenue-types.service';

@ApiTags('revenue-types')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(REVENUE_TYPES_API.PATH)
export class RevenueTypesController {
  constructor(private readonly revenueTypes: RevenueTypesService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ASSESSMENTS_VIEW)
  @ApiOperation({ summary: 'Revenue types (active by default)' })
  @ApiResponse({ status: HttpStatus.OK, type: [RevenueTypeResponseDto] })
  list(@Query() filter: RevenueTypeFilterDto): Promise<RevenueTypeResponseDto[]> {
    return this.revenueTypes.list(filter.includeInactive === true);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.ASSESSMENTS_VIEW)
  @ApiOperation({ summary: 'One revenue type' })
  @ApiResponse({ status: HttpStatus.OK, type: RevenueTypeResponseDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<RevenueTypeResponseDto> {
    return this.revenueTypes.get(id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.REVENUE_TYPES_MANAGE)
  @ApiOperation({ summary: 'Create a revenue type' })
  @ApiResponse({ status: HttpStatus.CREATED, type: RevenueTypeResponseDto })
  create(@Body() dto: CreateRevenueTypeDto): Promise<RevenueTypeResponseDto> {
    return this.revenueTypes.create(dto);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.REVENUE_TYPES_MANAGE)
  @ApiOperation({ summary: 'Edit a revenue type (rate changes affect new assessments only)' })
  @ApiResponse({ status: HttpStatus.OK, type: RevenueTypeResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRevenueTypeDto,
  ): Promise<RevenueTypeResponseDto> {
    return this.revenueTypes.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.REVENUE_TYPES_MANAGE)
  @ApiOperation({ summary: 'Delete if unused, otherwise deactivate (returns the deactivated row)' })
  @ApiResponse({ status: HttpStatus.OK, type: RevenueTypeResponseDto })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<RevenueTypeResponseDto | null> {
    return this.revenueTypes.remove(id);
  }
}
