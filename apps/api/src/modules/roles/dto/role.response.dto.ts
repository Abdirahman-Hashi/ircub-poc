import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PERMISSION_CODES, type PermissionCode, type RoleDetail } from '@ircub/shared';

export class RoleResponseDto implements RoleDetail {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'REVENUE_OFFICER' })
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  parentId!: string | null;

  @ApiProperty({ description: 'Built-in roles cannot be deleted' })
  isSystem!: boolean;

  @ApiProperty({ enum: PERMISSION_CODES, isArray: true, description: 'Directly assigned' })
  permissionCodes!: PermissionCode[];

  @ApiProperty({
    enum: PERMISSION_CODES,
    isArray: true,
    description: 'From ancestors (read-only in the matrix)',
  })
  inheritedPermissionCodes!: PermissionCode[];

  @ApiProperty()
  userCount!: number;
}
