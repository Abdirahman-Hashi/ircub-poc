import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { EfficiencyRow } from '@ircub/shared';

export class EfficiencyRowResponseDto implements EfficiencyRow {
  @ApiProperty() period!: string;
  @ApiProperty() billed!: string;
  @ApiProperty() collected!: string;
  @ApiPropertyOptional({ nullable: true }) efficiencyPct!: number | null;
}
