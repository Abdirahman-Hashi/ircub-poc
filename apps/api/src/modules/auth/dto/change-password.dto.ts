import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @ApiProperty({ description: 'Must satisfy the password policy (see SystemConfig PASSWORD_*)' })
  @IsString()
  @MinLength(1)
  newPassword!: string;
}
