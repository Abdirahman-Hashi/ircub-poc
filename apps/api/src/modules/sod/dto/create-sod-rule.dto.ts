import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';

import { PERMISSION_CODES, type PermissionCode } from '@ircub/shared';

export class CreateSodRuleDto {
  @ApiProperty({ enum: PERMISSION_CODES, example: 'reversals.capture' })
  @IsIn(PERMISSION_CODES)
  permissionACode!: PermissionCode;

  @ApiProperty({ enum: PERMISSION_CODES, example: 'reversals.approve' })
  @IsIn(PERMISSION_CODES)
  permissionBCode!: PermissionCode;

  @ApiProperty({ example: 'The user who captures a reversal cannot approve it' })
  @IsString()
  @MinLength(1)
  description!: string;
}
