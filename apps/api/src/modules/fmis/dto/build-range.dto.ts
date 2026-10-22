import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, Matches } from 'class-validator';

import { FMIS_API } from '../fmis.constants';

export class BuildRangeDto {
  @ApiProperty({ example: '2026-09-22' })
  @Matches(FMIS_API.DATE_PATTERN)
  from!: string;

  @ApiProperty({ example: '2026-10-21' })
  @Matches(FMIS_API.DATE_PATTERN)
  to!: string;

  @ApiPropertyOptional({ default: true, description: 'See POST /fmis/batches/build' })
  @IsOptional()
  @IsBoolean()
  catchUp?: boolean;
}
