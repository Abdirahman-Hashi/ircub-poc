import { ApiProperty } from '@nestjs/swagger';

import { Currency, type FxRateView } from '@ircub/shared';

export class FxRateResponseDto implements FxRateView {
  @ApiProperty({ enum: Currency })
  base!: Currency;

  @ApiProperty({ enum: Currency })
  quote!: Currency;

  @ApiProperty({ example: '571.500000', description: 'Decimal string, 6 dp' })
  rate!: string;

  @ApiProperty()
  asOf!: Date;

  @ApiProperty({ example: 'mock-fx-api' })
  source!: string;

  @ApiProperty({
    description: 'Provider unreachable and the stored rate is older than the stale window',
  })
  stale!: boolean;
}
