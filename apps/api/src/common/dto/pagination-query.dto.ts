import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { PAGINATION } from '@ircub/shared';

/** Base class for every list endpoint's query DTO. */
export class PaginationQueryDto {
  @ApiPropertyOptional({ default: PAGINATION.DEFAULT_PAGE, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = PAGINATION.DEFAULT_PAGE;

  @ApiPropertyOptional({ default: PAGINATION.DEFAULT_PAGE_SIZE, maximum: PAGINATION.MAX_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION.MAX_PAGE_SIZE)
  pageSize: number = PAGINATION.DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({ description: '`field:asc` or `field:desc`', example: 'createdAt:desc' })
  @IsOptional()
  @IsString()
  sort?: string;
}
