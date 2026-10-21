import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { DuplicateFlagStatus } from '@ircub/shared';

const DECISIONS = [DuplicateFlagStatus.CONFIRMED, DuplicateFlagStatus.DISMISSED] as const;

export class ReviewDuplicateDto {
  @ApiProperty({ enum: DECISIONS })
  @IsIn(DECISIONS)
  status!: (typeof DECISIONS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
