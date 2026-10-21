import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { CsvImportSummaryView, CsvRejectedRow } from '@ircub/shared';

export class CsvRejectedRowDto implements CsvRejectedRow {
  @ApiProperty({ description: '1-based line number; the header is line 1' })
  row!: number;

  @ApiPropertyOptional()
  field?: string;

  @ApiProperty({ example: 'OVERPAYMENT' })
  reason!: string;

  @ApiProperty()
  message!: string;
}

export class CsvSummaryResponseDto implements CsvImportSummaryView {
  @ApiProperty()
  totalRows!: number;

  @ApiProperty()
  accepted!: number;

  @ApiProperty({ type: [CsvRejectedRowDto] })
  rejected!: CsvRejectedRowDto[];

  @ApiProperty()
  dryRun!: boolean;

  @ApiPropertyOptional({ format: 'uuid', description: 'Absent on dry run' })
  uploadId?: string;
}
