import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { BulkUploadKind, type BulkUploadView } from '@ircub/shared';

import { CsvSummaryResponseDto } from './csv-summary.response.dto';

export class BulkUploadResponseDto implements BulkUploadView {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: BulkUploadKind })
  kind!: BulkUploadKind;

  @ApiProperty()
  fileName!: string;

  @ApiProperty()
  totalRows!: number;

  @ApiProperty()
  accepted!: number;

  @ApiProperty()
  rejected!: number;

  @ApiProperty({ format: 'uuid' })
  uploadedById!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional({
    type: CsvSummaryResponseDto,
    description: 'Included on the detail endpoint',
  })
  summary?: CsvSummaryResponseDto;
}
