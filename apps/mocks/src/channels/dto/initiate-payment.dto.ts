import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';

import { type ChannelInitiateRequest, Currency } from '@ircub/shared';

const MONEY_PATTERN = /^[0-9]+(\.[0-9]{1,2})?$/;

export class InitiatePaymentDto implements ChannelInitiateRequest {
  @ApiProperty({ example: '150.00' })
  @IsString()
  @Matches(MONEY_PATTERN)
  amount!: string;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency!: Currency;

  @ApiProperty({ example: '000000000195' })
  @IsString()
  @MinLength(1)
  controlNumber!: string;

  @ApiProperty({ example: 'http://localhost:3000/payments/callback/BANK' })
  @IsString()
  @MinLength(1)
  callbackUrl!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  payerPhone?: string;

  @ApiPropertyOptional({
    description: "Caller's own reference, echoed in callbacks and status replies",
  })
  @IsOptional()
  @IsString()
  clientRef?: string;
}
