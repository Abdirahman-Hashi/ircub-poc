import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, Matches } from 'class-validator';

import { FMIS_API } from '../fmis.constants';

export class BuildBatchDto {
  @ApiProperty({ example: '2026-10-21', description: 'UTC business day' })
  @Matches(FMIS_API.DATE_PATTERN)
  date!: string;

  @ApiPropertyOptional({ description: 'Demo: ask the mock FMIS to fail this posting' })
  @IsOptional()
  @IsBoolean()
  forceFailure?: boolean;
}
