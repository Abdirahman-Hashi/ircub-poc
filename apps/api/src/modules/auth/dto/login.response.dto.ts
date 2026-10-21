import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { type LoginResponse, PERMISSION_CODES, type PermissionCode } from '@ircub/shared';

import { AuthUserResponseDto } from './auth-user.response.dto';

export class LoginResponseDto implements LoginResponse {
  @ApiProperty()
  mfaRequired!: boolean;

  @ApiPropertyOptional({ description: 'Present when mfaRequired; send with the TOTP code' })
  challengeToken?: string;

  @ApiPropertyOptional()
  accessToken?: string;

  @ApiPropertyOptional({ type: AuthUserResponseDto })
  user?: AuthUserResponseDto;

  @ApiPropertyOptional({ enum: PERMISSION_CODES, isArray: true })
  permissions?: PermissionCode[];
}
