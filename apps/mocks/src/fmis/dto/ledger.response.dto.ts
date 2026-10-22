import { ApiProperty } from '@nestjs/swagger';

import type { FmisLedgerEntry, FmisLedgerResponse } from '@ircub/shared';

export class LedgerEntryDto implements FmisLedgerEntry {
  @ApiProperty() glCode!: string;
  @ApiProperty() debit!: string;
  @ApiProperty() credit!: string;
}

export class LedgerResponseDto implements FmisLedgerResponse {
  @ApiProperty() date!: string;
  @ApiProperty({ type: [LedgerEntryDto] }) entries!: LedgerEntryDto[];
}
