import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, Matches } from 'class-validator';

import { DASHBOARD } from '@ircub/shared';

import { MONEY_PATTERN } from '../../assessments/assessments.constants';

export class UpsertTargetDto {
  @ApiProperty({ example: '2026-11' })
  @Matches(DASHBOARD.PERIOD_PATTERN)
  period!: string;

  @ApiProperty()
  @IsUUID()
  revenueTypeId!: string;

  @ApiProperty({ example: '2500000.00' })
  @Matches(MONEY_PATTERN)
  amount!: string;
}
