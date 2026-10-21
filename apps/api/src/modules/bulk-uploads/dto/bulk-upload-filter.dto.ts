import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import { BulkUploadKind } from '@ircub/shared';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class BulkUploadFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BulkUploadKind })
  @IsOptional()
  @IsEnum(BulkUploadKind)
  kind?: BulkUploadKind;
}
