import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

import { WaterAccountStatus } from '@ircub/shared';

import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

export class WaterAccountFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Account number, payer name, TIN or meter serial' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  payerId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  tariffCategoryId?: string;

  @ApiPropertyOptional({ enum: WaterAccountStatus })
  @IsOptional()
  @IsEnum(WaterAccountStatus)
  status?: WaterAccountStatus;
}
