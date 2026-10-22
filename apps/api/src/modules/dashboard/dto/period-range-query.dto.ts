import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

import { DASHBOARD } from '@ircub/shared';

export class PeriodRangeQueryDto {
  @ApiProperty({ example: '2026-01' })
  @Matches(DASHBOARD.PERIOD_PATTERN)
  from!: string;

  @ApiProperty({ example: '2026-10' })
  @Matches(DASHBOARD.PERIOD_PATTERN)
  to!: string;
}
