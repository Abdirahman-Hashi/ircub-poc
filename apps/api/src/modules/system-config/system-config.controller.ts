import { Body, Controller, Get, HttpStatus, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { PERMISSIONS } from '@ircub/shared';

import { SWAGGER } from '../../app.constants';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { RequirePermission } from '../../common/auth/require-permission.decorator';

import { SystemConfigEntryResponseDto } from './dto/system-config-entry.response.dto';
import { UpdateSystemConfigDto } from './dto/update-system-config.dto';
import { SYSTEM_CONFIG } from './system-config.constants';
import { SystemConfigService } from './system-config.service';

import type { AuthenticatedUser } from '../../common/auth/auth.types';

@ApiTags('config')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(SYSTEM_CONFIG.PATH)
@RequirePermission(PERMISSIONS.CONFIG_MANAGE)
export class SystemConfigController {
  constructor(private readonly systemConfig: SystemConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Every runtime-tunable parameter with its current and default value' })
  @ApiResponse({ status: HttpStatus.OK, type: [SystemConfigEntryResponseDto] })
  list(): Promise<SystemConfigEntryResponseDto[]> {
    return this.systemConfig.list();
  }

  @Put(':key')
  @ApiOperation({ summary: 'Set a parameter; takes effect within the cache window (30 s)' })
  @ApiResponse({ status: HttpStatus.OK, type: SystemConfigEntryResponseDto })
  update(
    @Param('key') key: string,
    @Body() dto: UpdateSystemConfigDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<SystemConfigEntryResponseDto> {
    return this.systemConfig.setValidated(key, dto.value, actor.id);
  }
}
