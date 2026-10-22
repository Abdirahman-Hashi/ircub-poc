import { ApiProperty } from '@nestjs/swagger';

import { ReconciliationLineResponseDto } from './reconciliation-line.response.dto';
import { ReconciliationRunResponseDto } from './reconciliation-run.response.dto';

export class ReconciliationRunDetailResponseDto extends ReconciliationRunResponseDto {
  @ApiProperty({ type: [ReconciliationLineResponseDto] })
  lines!: ReconciliationLineResponseDto[];
}
