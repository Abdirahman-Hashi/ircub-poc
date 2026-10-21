import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { DuplicateFlagStatus, DuplicateMatchField, type DuplicateFlagView } from '@ircub/shared';

import { PayerResponseDto } from './payer.response.dto';

export class DuplicateFlagResponseDto implements DuplicateFlagView {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: PayerResponseDto })
  payer!: PayerResponseDto;

  @ApiProperty({ type: PayerResponseDto })
  matchedPayer!: PayerResponseDto;

  @ApiProperty({ enum: DuplicateMatchField })
  matchField!: DuplicateMatchField;

  @ApiProperty({ enum: DuplicateFlagStatus })
  status!: DuplicateFlagStatus;

  @ApiPropertyOptional({ nullable: true })
  note!: string | null;

  @ApiPropertyOptional({ nullable: true })
  reviewedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}
