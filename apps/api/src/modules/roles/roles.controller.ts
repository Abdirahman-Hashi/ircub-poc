import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { PERMISSIONS } from '@ircub/shared';

import { SWAGGER } from '../../app.constants';
import { RequirePermission } from '../../common/auth/require-permission.decorator';

import { CreateRoleDto } from './dto/create-role.dto';
import { RoleResponseDto } from './dto/role.response.dto';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ROLES_API } from './roles.constants';
import { RolesService } from './roles.service';

@ApiTags('roles')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(ROLES_API.PATH)
@RequirePermission(PERMISSIONS.ROLES_MANAGE)
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'All roles with direct and inherited permissions' })
  @ApiResponse({ status: HttpStatus.OK, type: [RoleResponseDto] })
  list(): Promise<RoleResponseDto[]> {
    return this.roles.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one role' })
  @ApiResponse({ status: HttpStatus.OK, type: RoleResponseDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<RoleResponseDto> {
    return this.roles.get(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a custom role, optionally inheriting from a parent' })
  @ApiResponse({ status: HttpStatus.CREATED, type: RoleResponseDto })
  create(@Body() dto: CreateRoleDto): Promise<RoleResponseDto> {
    return this.roles.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename, describe or re-parent a role (cycle and SoD checked)' })
  @ApiResponse({ status: HttpStatus.OK, type: RoleResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    return this.roles.update(id, dto);
  }

  @Put(`:id/${ROLES_API.PERMISSIONS}`)
  @ApiOperation({ summary: 'Replace the role’s direct permissions (SoD checked for every holder)' })
  @ApiResponse({ status: HttpStatus.OK, type: RoleResponseDto })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'SOD_VIOLATION' })
  setPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetRolePermissionsDto,
  ): Promise<RoleResponseDto> {
    return this.roles.setPermissions(id, dto.codes);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a custom role that is not in use' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'SYSTEM_ROLE_IMMUTABLE' })
  delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.roles.delete(id);
  }
}
