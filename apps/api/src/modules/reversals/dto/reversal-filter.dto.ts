import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsUUID } from 'class-validator';

import { ReversalStatus } from '@ircub/shared';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ReversalFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ReversalStatus })
  @IsOptional()
  @IsEnum(ReversalStatus)
  status?: ReversalStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  payerId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  capturedById?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateFrom?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateTo?: Date;
}
