import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, MinLength } from 'class-validator';

const TOTP_DIGITS = 6;

export class MfaVerifyDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  challengeToken!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(TOTP_DIGITS, TOTP_DIGITS)
  code!: string;
}
