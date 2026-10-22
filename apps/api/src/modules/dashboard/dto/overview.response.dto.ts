import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { DashboardOverview } from '@ircub/shared';

export class OverviewResponseDto implements DashboardOverview {
  @ApiProperty() from!: string;
  @ApiProperty() to!: string;
  @ApiProperty() collected!: string;
  @ApiProperty() collectedCount!: number;
  @ApiProperty() collectedLastYear!: string;
  @ApiPropertyOptional({ nullable: true }) changeVsLastYearPct!: number | null;
  @ApiProperty() reversed!: string;
  @ApiProperty() reversedCount!: number;
  @ApiProperty() outstandingAssessments!: string;
  @ApiProperty() outstandingWater!: string;
  @ApiProperty() waterBilled!: string;
  @ApiProperty() waterCollected!: string;
  @ApiPropertyOptional({ nullable: true }) collectionEfficiencyPct!: number | null;
  @ApiProperty() target!: string;
  @ApiPropertyOptional({ nullable: true }) targetAttainmentPct!: number | null;
}
