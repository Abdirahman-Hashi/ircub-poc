import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import { Currency } from '@ircub/shared';

/** Defaults to the foreign currency → local currency pair the platform converts (D9). */
export class FxPairQueryDto {
  @ApiPropertyOptional({ enum: Currency, example: Currency.USD, description: 'Defaults to USD' })
  @IsOptional()
  @IsEnum(Currency)
  base?: Currency;

  @ApiPropertyOptional({
    enum: Currency,
    example: Currency.SOS,
    description: 'Defaults to the local currency',
  })
  @IsOptional()
  @IsEnum(Currency)
  quote?: Currency;
}
