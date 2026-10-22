import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, Matches } from 'class-validator';

import { ReconciliationRunStatus } from '@ircub/shared';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ONLINE_CHANNELS } from '../../payments/payments.constants';
import { RECONCILIATION_API } from '../reconciliation.constants';

export class ReconciliationRunFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ONLINE_CHANNELS })
  @IsOptional()
  @IsIn(ONLINE_CHANNELS)
  channel?: (typeof ONLINE_CHANNELS)[number];

  @ApiPropertyOptional({ enum: ReconciliationRunStatus })
  @IsOptional()
  @IsEnum(ReconciliationRunStatus)
  status?: ReconciliationRunStatus;

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @Matches(RECONCILIATION_API.DATE_PATTERN)
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional()
  @Matches(RECONCILIATION_API.DATE_PATTERN)
  dateTo?: string;
}
