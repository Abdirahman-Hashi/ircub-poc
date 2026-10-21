import { ApiProperty } from '@nestjs/swagger';

import {
  type MeResponse,
  PERMISSION_CODES,
  type PermissionCode,
  type RoleSummary,
} from '@ircub/shared';

import { AuthUserResponseDto } from './auth-user.response.dto';

export class RoleSummaryDto implements RoleSummary {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'REVENUE_OFFICER' })
  code!: string;

  @ApiProperty({ example: 'Revenue Officer' })
  name!: string;
}

export class MeResponseDto implements MeResponse {
  @ApiProperty({ type: AuthUserResponseDto })
  user!: AuthUserResponseDto;

  @ApiProperty({ type: [RoleSummaryDto] })
  roles!: RoleSummaryDto[];

  @ApiProperty({ enum: PERMISSION_CODES, isArray: true })
  permissions!: PermissionCode[];
}
