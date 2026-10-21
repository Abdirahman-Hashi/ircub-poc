import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import { DuplicateFlagStatus } from '@ircub/shared';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class DuplicateFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: DuplicateFlagStatus, default: DuplicateFlagStatus.PENDING })
  @IsOptional()
  @IsEnum(DuplicateFlagStatus)
  status?: DuplicateFlagStatus;
}
