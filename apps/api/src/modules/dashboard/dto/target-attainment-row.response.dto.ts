import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { TargetAttainmentRow } from '@ircub/shared';

class AttainmentRevenueTypeDto {
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
}

export class TargetAttainmentRowResponseDto implements TargetAttainmentRow {
  @ApiProperty() period!: string;
  @ApiProperty() revenueTypeId!: string;
  @ApiProperty({ type: AttainmentRevenueTypeDto }) revenueType!: AttainmentRevenueTypeDto;
  @ApiProperty() collected!: string;
  @ApiProperty() target!: string;
  @ApiPropertyOptional({ nullable: true }) attainmentPct!: number | null;
}
