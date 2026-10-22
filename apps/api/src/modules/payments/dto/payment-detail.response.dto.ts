import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PaymentJournalSummaryDto } from './payment-journal-summary.dto';
import { PaymentResponseDto } from './payment.response.dto';

/** Auditor view: everything the channel sent and received (D15). */
export class PaymentDetailResponseDto extends PaymentResponseDto {
  @ApiPropertyOptional({ nullable: true, description: 'Request sent to the channel at initiation' })
  channelRequestPayload!: unknown;

  @ApiPropertyOptional({ nullable: true, description: 'Last callback or status response' })
  callbackPayload!: unknown;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  lastStatusCheckAt!: Date | null;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  permanentlyFailedAt!: Date | null;

  @ApiPropertyOptional({ type: PaymentJournalSummaryDto, nullable: true })
  journalLine!: PaymentJournalSummaryDto | null;
}
