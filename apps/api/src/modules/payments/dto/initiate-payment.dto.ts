import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

import { Currency, PHONE } from '@ircub/shared';

import { MONEY_PATTERN } from '../../assessments/assessments.constants';
import { ONLINE_CHANNELS } from '../payments.constants';

export class InitiatePaymentDto {
  @ApiProperty({ example: '000000012395' })
  @IsString()
  @MinLength(1)
  controlNumber!: string;

  @ApiProperty({ example: '2500.00', description: 'Amount in `currency`' })
  @IsString()
  @Matches(MONEY_PATTERN)
  amount!: string;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency!: Currency;

  @ApiProperty({ enum: ONLINE_CHANNELS })
  @IsIn(ONLINE_CHANNELS)
  channel!: (typeof ONLINE_CHANNELS)[number];

  @ApiPropertyOptional({ example: '+252611234567', description: 'Mobile money wallet' })
  @IsOptional()
  @Matches(PHONE.E164_PATTERN)
  payerPhone?: string;
}
