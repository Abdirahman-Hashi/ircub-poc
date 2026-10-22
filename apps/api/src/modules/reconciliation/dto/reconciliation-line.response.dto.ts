import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Currency, ReconciliationLineStatus } from '@ircub/shared';
import type { ReconciliationLineView } from '@ircub/shared';

export class ReconciliationLineResponseDto implements ReconciliationLineView {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ReconciliationLineStatus }) status!: ReconciliationLineStatus;
  @ApiProperty() txnRef!: string;
  @ApiPropertyOptional({ nullable: true }) paymentId!: string | null;
  @ApiPropertyOptional({ nullable: true }) controlNumber!: string | null;
  @ApiPropertyOptional({ nullable: true }) ircubAmount!: string | null;
  @ApiPropertyOptional({ nullable: true }) channelAmount!: string | null;
  @ApiPropertyOptional({ enum: Currency, nullable: true }) currency!: Currency | null;
  @ApiPropertyOptional({ nullable: true }) note!: string | null;
}
