import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import { BillingCycleStatus } from '@ircub/shared';

import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

export class BillingCycleFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BillingCycleStatus })
  @IsOptional()
  @IsEnum(BillingCycleStatus)
  status?: BillingCycleStatus;
}
