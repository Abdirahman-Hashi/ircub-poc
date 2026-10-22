import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, Matches } from 'class-validator';

import { JournalBatchKind, JournalBatchStatus } from '@ircub/shared';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { FMIS_API } from '../fmis.constants';

export class JournalBatchFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: JournalBatchStatus })
  @IsOptional()
  @IsEnum(JournalBatchStatus)
  status?: JournalBatchStatus;

  @ApiPropertyOptional({ enum: JournalBatchKind })
  @IsOptional()
  @IsEnum(JournalBatchKind)
  kind?: JournalBatchKind;

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @Matches(FMIS_API.DATE_PATTERN)
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional()
  @Matches(FMIS_API.DATE_PATTERN)
  dateTo?: string;
}
