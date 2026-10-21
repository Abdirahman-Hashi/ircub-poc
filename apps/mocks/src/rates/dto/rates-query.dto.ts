import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { Currency } from '@ircub/shared';

export class RatesQueryDto {
  @ApiPropertyOptional({ enum: Currency, default: Currency.USD })
  @IsOptional()
  @IsEnum(Currency)
  base?: Currency;

  @ApiPropertyOptional({ description: 'Set to 1 to simulate an outage (503).' })
  @IsOptional()
  @IsString()
  fail?: string;
}
