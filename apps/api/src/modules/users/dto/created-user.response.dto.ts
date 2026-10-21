import { ApiProperty } from '@nestjs/swagger';

import type { CreatedUser } from '@ircub/shared';

import { UserResponseDto } from './user.response.dto';

export class CreatedUserResponseDto extends UserResponseDto implements CreatedUser {
  @ApiProperty({ description: 'Shown once; the user must change it at first login' })
  temporaryPassword!: string;
}
