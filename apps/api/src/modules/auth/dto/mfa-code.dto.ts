import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

const TOTP_DIGITS = 6;

export class MfaCodeDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(TOTP_DIGITS, TOTP_DIGITS)
  code!: string;
}
