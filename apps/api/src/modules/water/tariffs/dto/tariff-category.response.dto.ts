import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { TariffCategoryView, TariffTierView } from '@ircub/shared';

export class TariffTierResponseDto implements TariffTierView {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  fromUnit!: number;

  @ApiPropertyOptional({ nullable: true })
  toUnit!: number | null;

  @ApiProperty({ example: '285.75' })
  ratePerUnit!: string;
}

export class TariffCategoryResponseDto implements TariffCategoryView {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ example: '5000.00' })
  fixedCharge!: string;

  @ApiProperty()
  active!: boolean;

  @ApiProperty({ type: [TariffTierResponseDto] })
  tiers!: TariffTierResponseDto[];
}
