import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Matches, Min, ValidateIf } from 'class-validator';

import { MONEY_PATTERN } from '../../../assessments/assessments.constants';

export class TariffTierDto {
  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  fromUnit!: number;

  @ApiPropertyOptional({ example: 10, nullable: true, description: 'null = open-ended last band' })
  @ValidateIf((_o, value) => value !== null)
  @IsOptional()
  @IsInt()
  @Min(1)
  toUnit!: number | null;

  @ApiProperty({ example: '285.75' })
  @IsString()
  @Matches(MONEY_PATTERN)
  ratePerUnit!: string;
}
