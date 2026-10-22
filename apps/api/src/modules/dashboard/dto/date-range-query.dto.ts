import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

import { DASHBOARD } from '@ircub/shared';

export class DateRangeQueryDto {
  @ApiProperty({ example: '2026-09-22' })
  @Matches(DASHBOARD.DATE_PATTERN)
  from!: string;

  @ApiProperty({ example: '2026-10-22' })
  @Matches(DASHBOARD.DATE_PATTERN)
  to!: string;
}
