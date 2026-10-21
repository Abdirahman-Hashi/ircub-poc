import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { RateType, type RevenueTypeView } from '@ircub/shared';

export class RevenueTypeResponseDto implements RevenueTypeView {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'BUSINESS_LICENCE' })
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: RateType })
  rateType!: RateType;

  @ApiProperty({ example: '150000.00' })
  rate!: string;

  @ApiProperty({ example: '4010' })
  glCode!: string;

  @ApiProperty()
  active!: boolean;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;
}
