import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PaymentChannel, ReconciliationRunStatus } from '@ircub/shared';
import type { ReconciliationRunView } from '@ircub/shared';

export class ReconciliationRunResponseDto implements ReconciliationRunView {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: PaymentChannel }) channel!: PaymentChannel;
  @ApiProperty({ type: String, format: 'date' }) runDate!: Date;
  @ApiProperty({ enum: ReconciliationRunStatus }) status!: ReconciliationRunStatus;
  @ApiProperty() matched!: number;
  @ApiProperty() missingInIrcub!: number;
  @ApiProperty() missingInChannel!: number;
  @ApiProperty() amountMismatch!: number;
  @ApiPropertyOptional({ nullable: true }) statementFileName!: string | null;
  @ApiPropertyOptional({ nullable: true }) error!: string | null;
  @ApiProperty() createdAt!: Date;
}
