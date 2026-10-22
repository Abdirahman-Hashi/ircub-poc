import { ApiProperty } from '@nestjs/swagger';

import type { DashboardBy, TrendPoint, TrendSeries, TrendsResponse } from '@ircub/shared';

class TrendPointDto implements TrendPoint {
  @ApiProperty() bucket!: string;
  @ApiProperty() total!: string;
  @ApiProperty() count!: number;
}

class TrendSeriesDto implements TrendSeries {
  @ApiProperty() key!: string;
  @ApiProperty() label!: string;
  @ApiProperty({ type: [TrendPointDto] }) points!: TrendPointDto[];
}

export class TrendsResponseDto implements TrendsResponse {
  @ApiProperty() groupBy!: string;
  @ApiProperty() by!: DashboardBy;
  @ApiProperty({ type: [String] }) buckets!: string[];
  @ApiProperty({ type: [TrendSeriesDto] }) series!: TrendSeriesDto[];
}
