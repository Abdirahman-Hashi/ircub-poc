import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

import { Currency } from '@ircub/shared';

import { MONEY_PATTERN } from '../../assessments/assessments.constants';
import { MANUAL_CHANNELS } from '../payments.constants';

export class CapturePaymentDto {
  @ApiProperty({ example: '000000012395' })
  @IsString()
  @MinLength(1)
  controlNumber!: string;

  @ApiProperty({ example: '2500.00' })
  @IsString()
  @Matches(MONEY_PATTERN)
  amount!: string;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency!: Currency;

  @ApiProperty({ enum: MANUAL_CHANNELS })
  @IsIn(MANUAL_CHANNELS)
  channel!: (typeof MANUAL_CHANNELS)[number];

  @ApiPropertyOptional({ description: 'Required for BANK and MOBILE_MONEY' })
  @IsOptional()
  @IsString()
  channelTxnRef?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'Defaults to now' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  paidAt?: Date;
}
