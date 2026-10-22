import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import { DASHBOARD, DASHBOARD_BY_VALUES, DASHBOARD_GROUP_BY_VALUES } from '@ircub/shared';
import type { DashboardBy, DashboardGroupBy } from '@ircub/shared';

import { DateRangeQueryDto } from './date-range-query.dto';

export class TrendsQueryDto extends DateRangeQueryDto {
  @ApiPropertyOptional({ enum: DASHBOARD_GROUP_BY_VALUES, default: DASHBOARD.GROUP_BY.DAY })
  @IsOptional()
  @IsIn(DASHBOARD_GROUP_BY_VALUES)
  groupBy: DashboardGroupBy = DASHBOARD.GROUP_BY.DAY;

  @ApiPropertyOptional({ enum: DASHBOARD_BY_VALUES, default: DASHBOARD.BY.REVENUE_TYPE })
  @IsOptional()
  @IsIn(DASHBOARD_BY_VALUES)
  by: DashboardBy = DASHBOARD.BY.REVENUE_TYPE;
}
