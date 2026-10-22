import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsISO8601, IsOptional, IsString, Matches, MinLength } from 'class-validator';

import { ChannelOutcome, Currency } from '@ircub/shared';

import { MONEY_PATTERN } from '../../assessments/assessments.constants';

const FINAL_OUTCOMES = [ChannelOutcome.SUCCESS, ChannelOutcome.FAILED] as const;

/** Body a channel posts to `/payments/callback/:channel` (signed over the raw bytes). */
export class ChannelCallbackDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  txnRef!: string;

  @ApiProperty({ enum: FINAL_OUTCOMES })
  @IsIn(FINAL_OUTCOMES)
  status!: (typeof FINAL_OUTCOMES)[number];

  @ApiProperty({ example: '2500.00' })
  @IsString()
  @Matches(MONEY_PATTERN)
  amount!: string;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency!: Currency;

  @ApiProperty()
  @IsString()
  controlNumber!: string;

  @ApiProperty({ format: 'date-time' })
  @IsISO8601()
  paidAt!: string;

  @ApiPropertyOptional({
    description:
      'IRCUB payment id sent at initiation; lets a callback find a payment whose initiation reply was lost',
  })
  @IsOptional()
  @IsString()
  clientRef?: string;
}
