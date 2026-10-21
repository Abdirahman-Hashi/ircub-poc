import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

import { CreateTariffCategoryDto } from './create-tariff-category.dto';

export class UpdateTariffCategoryDto extends PartialType(
  OmitType(CreateTariffCategoryDto, ['code'] as const),
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
