import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  BillingCycleStatus,
  type BillingCycleStats,
  type BillingCycleView,
  type SkippedAccount,
} from '@ircub/shared';

export class SkippedAccountDto implements SkippedAccount {
  @ApiProperty()
  accountNumber!: string;

  @ApiProperty({ example: 'NO_READING_IN_PERIOD' })
  reason!: string;
}

export class BillingCycleStatsDto implements BillingCycleStats {
  @ApiProperty()
  accounts!: number;

  @ApiProperty()
  billed!: number;

  @ApiProperty()
  flagged!: number;

  @ApiProperty({ type: [SkippedAccountDto] })
  skipped!: SkippedAccountDto[];

  @ApiProperty({ example: '1250000.00' })
  totalBilled!: string;

  @ApiPropertyOptional()
  notificationsSent?: number;
}

export class BillingCycleResponseDto implements BillingCycleView {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '2026-10' })
  period!: string;

  @ApiProperty({ enum: BillingCycleStatus })
  status!: BillingCycleStatus;

  @ApiProperty()
  runAt!: Date;

  @ApiPropertyOptional({ nullable: true })
  releasedAt!: Date | null;

  @ApiProperty({ type: BillingCycleStatsDto })
  stats!: BillingCycleStatsDto;
}
