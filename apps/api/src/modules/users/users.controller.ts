import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { type Paginated, PERMISSIONS } from '@ircub/shared';

import { SWAGGER } from '../../app.constants';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { RequirePermission } from '../../common/auth/require-permission.decorator';

import { CreateUserDto } from './dto/create-user.dto';
import { CreatedUserResponseDto } from './dto/created-user.response.dto';
import { ResetPasswordResponseDto } from './dto/reset-password.response.dto';
import { SetUserRolesDto } from './dto/set-user-roles.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { UserResponseDto } from './dto/user.response.dto';
import { USERS_API } from './users.constants';
import { UsersService } from './users.service';

import type { AuthenticatedUser } from '../../common/auth/auth.types';

@ApiTags('users')
@ApiBearerAuth(SWAGGER.BEARER_SCHEME)
@Controller(USERS_API.PATH)
@RequirePermission(PERMISSIONS.USERS_MANAGE)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users with search, status and role filters' })
  @ApiResponse({ status: HttpStatus.OK, type: [UserResponseDto] })
  list(@Query() filter: UserFilterDto): Promise<Paginated<UserResponseDto>> {
    return this.users.list(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one user' })
  @ApiResponse({ status: HttpStatus.OK, type: UserResponseDto })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.users.get(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a user with a temporary password and initial roles' })
  @ApiResponse({ status: HttpStatus.CREATED, type: CreatedUserResponseDto })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'SOD_VIOLATION' })
  create(@Body() dto: CreateUserDto): Promise<CreatedUserResponseDto> {
    return this.users.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit name or email' })
  @ApiResponse({ status: HttpStatus.OK, type: UserResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.users.update(id, dto);
  }

  @Put(`:id/${USERS_API.ROLES}`)
  @ApiOperation({ summary: 'Replace the user’s roles (segregation of duties enforced)' })
  @ApiResponse({ status: HttpStatus.OK, type: UserResponseDto })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'SOD_VIOLATION' })
  setRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetUserRolesDto,
  ): Promise<UserResponseDto> {
    return this.users.setRoles(id, dto.roleIds);
  }

  @Post(`:id/${USERS_API.DEACTIVATE}`)
  @ApiOperation({ summary: 'Deactivate; revokes all sessions' })
  @ApiResponse({ status: HttpStatus.CREATED, type: UserResponseDto })
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.users.deactivate(id, actor.id);
  }

  @Post(`:id/${USERS_API.REACTIVATE}`)
  @ApiOperation({ summary: 'Reactivate and clear any lockout' })
  @ApiResponse({ status: HttpStatus.CREATED, type: UserResponseDto })
  reactivate(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.users.reactivate(id);
  }

  @Post(`:id/${USERS_API.RESET_PASSWORD}`)
  @ApiOperation({ summary: 'Issue a new temporary password; revokes all sessions' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ResetPasswordResponseDto })
  resetPassword(@Param('id', ParseUUIDPipe) id: string): Promise<ResetPasswordResponseDto> {
    return this.users.resetPassword(id);
  }
}
