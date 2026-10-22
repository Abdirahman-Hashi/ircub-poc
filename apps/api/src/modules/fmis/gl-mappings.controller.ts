import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { PERMISSIONS } from '@ircub/shared';

import { SWAGGER } from '../../app.constants';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { RequirePermission } from '../../common/auth/require-permission.decorator';

import { CreateGlMappingDto } from './dto/create-gl-mapping.dto';
import { GlMappingResponseDto } from './dto/gl-mapping.response.dto';
import { FMIS_API } from './fmis.constants';
import { GlMappingsService } from './gl-mappings.service';

import type { AuthenticatedUser } from '../../common/auth/auth.types';

@ApiTags('fmis')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(`${FMIS_API.PATH}/${FMIS_API.MAPPINGS}`)
export class GlMappingsController {
  constructor(private readonly mappings: GlMappingsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.FMIS_VIEW)
  @ApiOperation({ summary: 'GL mappings, newest effective date first per revenue type' })
  @ApiQuery({ name: 'revenueTypeId', required: false })
  @ApiResponse({ status: HttpStatus.OK, type: [GlMappingResponseDto] })
  list(@Query('revenueTypeId') revenueTypeId?: string): Promise<GlMappingResponseDto[]> {
    return this.mappings.list(revenueTypeId);
  }

  @Post()
  @RequirePermission(PERMISSIONS.GL_MAPPINGS_MANAGE)
  @ApiOperation({ summary: 'Add an effective-dated GL mapping for a revenue type' })
  @ApiResponse({ status: HttpStatus.CREATED, type: GlMappingResponseDto })
  create(
    @Body() dto: CreateGlMappingDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<GlMappingResponseDto> {
    return this.mappings.create(dto, actor.id);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.GL_MAPPINGS_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a mapping (posted lines keep the GL they were posted with)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.mappings.remove(id);
  }
}
