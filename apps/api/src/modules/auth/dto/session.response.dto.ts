import { ApiProperty } from '@nestjs/swagger';

import { PERMISSION_CODES, type PermissionCode, type SessionResponse } from '@ircub/shared';

import { AuthUserResponseDto } from './auth-user.response.dto';

export class SessionResponseDto implements SessionResponse {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ type: AuthUserResponseDto })
  user!: AuthUserResponseDto;

  @ApiProperty({ enum: PERMISSION_CODES, isArray: true })
  permissions!: PermissionCode[];
}
