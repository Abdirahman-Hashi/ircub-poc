import { ApiProperty } from '@nestjs/swagger';
import { IsIn, Matches } from 'class-validator';

import { ONLINE_CHANNELS } from '../../payments/payments.constants';
import { RECONCILIATION_API } from '../reconciliation.constants';

/** Multipart fields accompanying a manually uploaded statement file. */
export class UploadStatementDto {
  @ApiProperty({ enum: ONLINE_CHANNELS })
  @IsIn(ONLINE_CHANNELS)
  channel!: (typeof ONLINE_CHANNELS)[number];

  @ApiProperty({ example: '2026-10-21' })
  @Matches(RECONCILIATION_API.DATE_PATTERN)
  date!: string;
}
