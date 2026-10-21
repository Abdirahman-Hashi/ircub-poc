import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';

import { RateType } from '@ircub/shared';

const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const DECIMAL_PATTERN = /^[0-9]+(\.[0-9]{1,2})?$/;

export class CreateRevenueTypeDto {
  @ApiProperty({ example: 'BUSINESS_LICENCE' })
  @IsString()
  @Matches(CODE_PATTERN)
  code!: string;

  @ApiProperty({ example: 'Business licence' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ enum: RateType })
  @IsEnum(RateType)
  rateType!: RateType;

  @ApiProperty({
    example: '150000.00',
    description: 'FIXED: local amount. PERCENT: percentage of the base amount.',
  })
  @IsString()
  @Matches(DECIMAL_PATTERN)
  rate!: string;

  @ApiProperty({ example: '4010' })
  @IsString()
  @MinLength(1)
  glCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
