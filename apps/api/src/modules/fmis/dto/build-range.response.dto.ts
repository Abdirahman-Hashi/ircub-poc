import { ApiProperty } from '@nestjs/swagger';

import { JournalBatchResponseDto } from './journal-batch.response.dto';

export class BuildRangeResponseDto {
  @ApiProperty({ type: [JournalBatchResponseDto] })
  built!: JournalBatchResponseDto[];

  @ApiProperty({ description: 'Days in the range with nothing eligible' })
  skipped!: number;
}
