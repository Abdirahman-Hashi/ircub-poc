import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { ReadingPreview } from '@ircub/shared';

export class ReadingPreviewResponseDto implements ReadingPreview {
  @ApiProperty({ format: 'uuid' })
  meterId!: string;

  @ApiProperty()
  previousReading!: number;

  @ApiPropertyOptional({ nullable: true })
  previousDate!: Date | null;

  @ApiProperty()
  consumption!: number;

  @ApiProperty()
  abnormal!: boolean;

  @ApiPropertyOptional({ nullable: true })
  abnormalReason!: string | null;
}
