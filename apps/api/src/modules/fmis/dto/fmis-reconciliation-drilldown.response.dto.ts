import { ApiProperty } from '@nestjs/swagger';

import type { FmisReconciliationDrilldown } from '@ircub/shared';

import { JournalLineResponseDto } from './journal-line.response.dto';

export class FmisReconciliationDrilldownResponseDto implements FmisReconciliationDrilldown {
  @ApiProperty() date!: string;
  @ApiProperty() glCode!: string;
  @ApiProperty({ type: [JournalLineResponseDto] }) lines!: JournalLineResponseDto[];
}
