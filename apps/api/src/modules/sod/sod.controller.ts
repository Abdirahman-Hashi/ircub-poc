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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { PERMISSIONS } from '@ircub/shared';

import { SWAGGER } from '../../app.constants';
import { RequirePermission } from '../../common/auth/require-permission.decorator';

import { CreateSodRuleDto } from './dto/create-sod-rule.dto';
import { SodRuleResponseDto } from './dto/sod-rule.response.dto';
import { SOD_API } from './sod.constants';
import { SodService } from './sod.service';

@ApiTags('sod')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(SOD_API.PATH)
@RequirePermission(PERMISSIONS.ROLES_MANAGE)
export class SodController {
  constructor(private readonly sod: SodService) {}

  @Get()
  @ApiOperation({ summary: 'Segregation-of-duties rules' })
  @ApiResponse({ status: HttpStatus.OK, type: [SodRuleResponseDto] })
  list(): Promise<SodRuleResponseDto[]> {
    return this.sod.list();
  }

  @Post()
  @ApiOperation({ summary: 'Add a rule; rejected if any user already violates it' })
  @ApiResponse({ status: HttpStatus.CREATED, type: SodRuleResponseDto })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'SOD_VIOLATION (existing holders) | CONFLICT (duplicate)',
  })
  create(@Body() dto: CreateSodRuleDto): Promise<SodRuleResponseDto> {
    return this.sod.create(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a rule' })
  delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.sod.delete(id);
  }
}
