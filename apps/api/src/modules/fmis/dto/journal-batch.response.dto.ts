import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { JournalBatchKind, JournalBatchStatus } from '@ircub/shared';
import type { JournalBatchView } from '@ircub/shared';

export class JournalBatchResponseDto implements JournalBatchView {
  @ApiProperty() id!: string;
  @ApiProperty({ type: String, format: 'date' }) batchDate!: Date;
  @ApiProperty({ enum: JournalBatchKind }) kind!: JournalBatchKind;
  @ApiProperty({ enum: JournalBatchStatus }) status!: JournalBatchStatus;
  @ApiProperty() lineCount!: number;
  @ApiProperty({ example: '125000.00' }) totalLocal!: string;
  @ApiPropertyOptional({ nullable: true }) fmisReference!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  postedAt!: Date | null;
  @ApiProperty() attempts!: number;
  @ApiPropertyOptional({ nullable: true }) lastError!: string | null;
  @ApiPropertyOptional({ nullable: true }) reversedByBatchId!: string | null;
  @ApiProperty() createdAt!: Date;
}
