import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

import { CreateRevenueTypeDto } from './create-revenue-type.dto';

export class UpdateRevenueTypeDto extends PartialType(
  OmitType(CreateRevenueTypeDto, ['code'] as const),
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
