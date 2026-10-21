import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { MeterStatus, type MeterView } from '@ircub/shared';

import { MeterReadingResponseDto } from '../../readings/dto/meter-reading.response.dto';

export class MeterResponseDto implements MeterView {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'MTR-000001' })
  serial!: string;

  @ApiProperty({ format: 'uuid' })
  accountId!: string;

  @ApiProperty({ example: 6 })
  maxDigits!: number;

  @ApiProperty({ example: 0 })
  initialReading!: number;

  @ApiProperty()
  installedAt!: Date;

  @ApiProperty({ enum: MeterStatus })
  status!: MeterStatus;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  replacesMeterId!: string | null;

  @ApiPropertyOptional({ type: MeterReadingResponseDto, nullable: true })
  lastReading!: MeterReadingResponseDto | null;
}
