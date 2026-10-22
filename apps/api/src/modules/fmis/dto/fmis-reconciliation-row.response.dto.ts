import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { FmisReconciliationStatus } from '@ircub/shared';
import type { FmisReconciliationRow } from '@ircub/shared';

export class FmisReconciliationRowResponseDto implements FmisReconciliationRow {
  @ApiProperty({ example: '2026-10-21' }) date!: string;
  @ApiProperty() glCode!: string;
  @ApiPropertyOptional({ nullable: true }) glName!: string | null;
  @ApiProperty({ description: 'Net credit of POSTED lines' }) ircubTotal!: string;
  @ApiProperty({ description: 'Net credit in the FMIS ledger' }) fmisTotal!: string;
  @ApiProperty() difference!: string;
  @ApiProperty({ enum: FmisReconciliationStatus }) status!: FmisReconciliationStatus;
}
