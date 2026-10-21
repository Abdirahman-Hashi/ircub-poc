import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { type MeterReadingView, ReadingSource, ReadingType } from '@ircub/shared';

export class MeterReadingResponseDto implements MeterReadingView {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  meterId!: string;

  @ApiProperty()
  meterSerial!: string;

  @ApiProperty({ format: 'uuid' })
  accountId!: string;

  @ApiProperty()
  accountNumber!: string;

  @ApiProperty()
  readingDate!: Date;

  @ApiProperty()
  readingValue!: number;

  @ApiProperty({ enum: ReadingType })
  type!: ReadingType;

  @ApiProperty()
  consumption!: number;

  @ApiProperty({ enum: ReadingSource })
  source!: ReadingSource;

  @ApiProperty()
  abnormal!: boolean;

  @ApiPropertyOptional({ nullable: true })
  abnormalReason!: string | null;

  @ApiProperty()
  createdAt!: Date;
}
