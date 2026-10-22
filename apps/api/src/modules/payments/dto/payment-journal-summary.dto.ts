import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { JournalBatchStatus } from '@ircub/shared';
import type { PaymentJournalSummary } from '@ircub/shared';

/** Where a payment sits in the FMIS chain: line → batch → reference (phase 5). */
export class PaymentJournalSummaryDto implements PaymentJournalSummary {
  @ApiProperty() lineId!: string;
  @ApiProperty() batchId!: string;
  @ApiProperty({ type: String, format: 'date' }) batchDate!: Date;
  @ApiProperty({ enum: JournalBatchStatus }) batchStatus!: JournalBatchStatus;
  @ApiPropertyOptional({ nullable: true }) fmisReference!: string | null;
  @ApiProperty() reversed!: boolean;
}
