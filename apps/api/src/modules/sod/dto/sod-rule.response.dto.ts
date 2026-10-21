import { ApiProperty } from '@nestjs/swagger';

import { PERMISSION_CODES, type PermissionCode, type SodRuleView } from '@ircub/shared';

export class SodRuleResponseDto implements SodRuleView {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: PERMISSION_CODES })
  permissionACode!: PermissionCode;

  @ApiProperty({ enum: PERMISSION_CODES })
  permissionBCode!: PermissionCode;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  createdAt!: Date;
}
