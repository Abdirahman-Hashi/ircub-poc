import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { FORECAST_MODEL_VALUES } from '@ircub/shared';
import type { ForecastModel, ForecastPoint, ForecastResponse, ForecastResult } from '@ircub/shared';

class ForecastPointDto implements ForecastPoint {
  @ApiProperty() period!: string;
  @ApiProperty() total!: string;
  @ApiProperty() forecast!: boolean;
}

export class ForecastSeriesResponseDto implements ForecastResult {
  @ApiProperty({ enum: FORECAST_MODEL_VALUES }) model!: ForecastModel;
  @ApiProperty() key!: string;
  @ApiProperty() label!: string;
  @ApiProperty({ type: [ForecastPointDto] }) points!: ForecastPointDto[];
  @ApiProperty() slope!: number;
  @ApiProperty() intercept!: number;
  @ApiPropertyOptional({ nullable: true }) r2!: number | null;
  @ApiProperty() n!: number;
  @ApiProperty() caveat!: string;
}

export class ForecastResponseDto implements ForecastResponse {
  @ApiProperty({ enum: FORECAST_MODEL_VALUES }) model!: ForecastModel;
  @ApiProperty() horizonMonths!: number;
  @ApiProperty({ type: [ForecastSeriesResponseDto] }) series!: ForecastSeriesResponseDto[];
}
