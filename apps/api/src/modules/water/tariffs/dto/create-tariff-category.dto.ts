import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { MONEY_PATTERN } from '../../../assessments/assessments.constants';

import { TariffTierDto } from './tariff-tier.dto';

const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

export class CreateTariffCategoryDto {
  @ApiProperty({ example: 'DOMESTIC' })
  @IsString()
  @Matches(CODE_PATTERN)
  code!: string;

  @ApiProperty({ example: 'Domestic' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: '5000.00', description: 'Fixed monthly service charge' })
  @IsString()
  @Matches(MONEY_PATTERN)
  fixedCharge!: string;

  @ApiProperty({ type: [TariffTierDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TariffTierDto)
  tiers!: TariffTierDto[];
}
