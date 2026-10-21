import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

import { WATER } from '../../water.constants';

export class RunCycleDto {
  @ApiProperty({ example: '2026-10', description: 'YYYY-MM' })
  @IsString()
  @Matches(WATER.PERIOD_PATTERN)
  period!: string;
}
