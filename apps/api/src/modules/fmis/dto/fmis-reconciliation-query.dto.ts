import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

import { FMIS_API } from '../fmis.constants';

export class FmisReconciliationQueryDto {
  @ApiProperty({ example: '2026-10-01' })
  @Matches(FMIS_API.DATE_PATTERN)
  from!: string;

  @ApiProperty({ example: '2026-10-21' })
  @Matches(FMIS_API.DATE_PATTERN)
  to!: string;
}
