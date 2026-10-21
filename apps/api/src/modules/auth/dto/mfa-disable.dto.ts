import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class MfaDisableDto {
  @ApiProperty({ description: 'Current password, re-confirmed' })
  @IsString()
  @MinLength(1)
  password!: string;
}
