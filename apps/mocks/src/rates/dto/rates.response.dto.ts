import { ApiProperty } from '@nestjs/swagger';

import { Currency } from '@ircub/shared';

export class RatesResponseDto {
  @ApiProperty({ enum: Currency, example: Currency.USD })
  base!: Currency;

  @ApiProperty({ example: { USD: 1, SOS: 572.31 } })
  rates!: Record<Currency, number>;

  @ApiProperty({ example: '2026-10-21T09:00:00.000Z' })
  asOf!: string;
}
