import { ApiProperty } from '@nestjs/swagger';

import { JournalBatchResponseDto } from './journal-batch.response.dto';
import { JournalLineResponseDto } from './journal-line.response.dto';

export class JournalBatchDetailResponseDto extends JournalBatchResponseDto {
  @ApiProperty({ type: [JournalLineResponseDto] })
  lines!: JournalLineResponseDto[];
}
