import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, Matches } from 'class-validator';

import { ONLINE_CHANNELS } from '../../payments/payments.constants';
import { RECONCILIATION_API } from '../reconciliation.constants';

export class RunReconciliationDto {
  @ApiProperty({ enum: ONLINE_CHANNELS })
  @IsIn(ONLINE_CHANNELS)
  channel!: (typeof ONLINE_CHANNELS)[number];

  @ApiProperty({ example: '2026-10-21', description: 'UTC business day' })
  @Matches(RECONCILIATION_API.DATE_PATTERN)
  date!: string;

  @ApiPropertyOptional({ description: 'Demo: ask the mock channel for a perturbed statement' })
  @IsOptional()
  @IsBoolean()
  perturb?: boolean;
}
