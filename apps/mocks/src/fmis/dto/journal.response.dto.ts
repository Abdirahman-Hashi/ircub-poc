import { ApiProperty } from '@nestjs/swagger';

import type { FmisJournalResponse } from '@ircub/shared';

export class JournalResponseDto implements FmisJournalResponse {
  @ApiProperty({ example: 'FMIS-0B1E7968' })
  fmisReference!: string;

  @ApiProperty({ example: 'POSTED' })
  status!: string;
}
