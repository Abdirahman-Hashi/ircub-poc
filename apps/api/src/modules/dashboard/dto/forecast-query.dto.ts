import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

import { DASHBOARD, DASHBOARD_BY_VALUES, FORECAST_MODEL_VALUES } from '@ircub/shared';
import type { DashboardBy, ForecastModel } from '@ircub/shared';

const MAX_HORIZON_MONTHS = 12;

export class ForecastQueryDto {
  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_HORIZON_MONTHS,
    description: 'Defaults to FORECAST_HORIZON_MONTHS',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_HORIZON_MONTHS)
  months?: number;

  @ApiPropertyOptional({ enum: FORECAST_MODEL_VALUES, default: DASHBOARD.FORECAST_MODEL.OLS })
  @IsOptional()
  @IsIn(FORECAST_MODEL_VALUES)
  model: ForecastModel = DASHBOARD.FORECAST_MODEL.OLS;

  @ApiPropertyOptional({
    enum: DASHBOARD_BY_VALUES,
    description: 'Only revenueType is supported; omit for the total',
  })
  @IsOptional()
  @IsIn(DASHBOARD_BY_VALUES)
  by?: DashboardBy;
}
