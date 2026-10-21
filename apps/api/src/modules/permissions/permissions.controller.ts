import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { PERMISSIONS } from '@ircub/shared';

import { SWAGGER } from '../../app.constants';
import { RequirePermission } from '../../common/auth/require-permission.decorator';

import { PermissionGroupResponseDto } from './dto/permission-group.response.dto';
import { PERMISSIONS_API } from './permissions.constants';
import { PermissionsService } from './permissions.service';

@ApiTags('permissions')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(PERMISSIONS_API.PATH)
export class PermissionsController {
  constructor(private readonly permissions: PermissionsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ROLES_MANAGE)
  @ApiOperation({ summary: 'All permission codes, grouped for the role matrix' })
  @ApiResponse({ status: HttpStatus.OK, type: [PermissionGroupResponseDto] })
  list(): Promise<PermissionGroupResponseDto[]> {
    return this.permissions.listGrouped();
  }
}
