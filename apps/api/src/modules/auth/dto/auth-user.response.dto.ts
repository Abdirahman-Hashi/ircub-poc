import { ApiProperty } from '@nestjs/swagger';

import type { AuthUser } from '@ircub/shared';

export class AuthUserResponseDto implements AuthUser {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  mfaEnabled!: boolean;

  @ApiProperty({ description: 'Password older than the configured maximum age (warn only)' })
  passwordChangeRecommended!: boolean;
}
