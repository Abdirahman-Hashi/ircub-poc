import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { type UserSummary, UserStatus } from '@ircub/shared';

import { RoleSummaryDto } from '../../auth/dto/me.response.dto';

export class UserResponseDto implements UserSummary {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiProperty()
  mfaEnabled!: boolean;

  @ApiPropertyOptional({ nullable: true })
  lockedUntil!: Date | null;

  @ApiProperty({ type: [RoleSummaryDto] })
  roles!: RoleSummaryDto[];

  @ApiProperty()
  createdAt!: Date;
}
