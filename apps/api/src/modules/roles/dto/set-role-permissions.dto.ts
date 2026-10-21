import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsIn } from 'class-validator';

import { PERMISSION_CODES, type PermissionCode } from '@ircub/shared';

export class SetRolePermissionsDto {
  @ApiProperty({
    enum: PERMISSION_CODES,
    isArray: true,
    description: 'Full replacement set of direct permissions',
  })
  @IsArray()
  @ArrayUnique()
  @IsIn(PERMISSION_CODES, { each: true })
  codes!: PermissionCode[];
}
