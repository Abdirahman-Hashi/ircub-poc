import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { Currency } from '@ircub/shared';

export class FxPairQueryDto {
  @ApiProperty({ enum: Currency, example: Currency.USD })
  @IsEnum(Currency)
  base!: Currency;

  @ApiProperty({ enum: Currency, example: Currency.SOS })
  @IsEnum(Currency)
  quote!: Currency;
}
