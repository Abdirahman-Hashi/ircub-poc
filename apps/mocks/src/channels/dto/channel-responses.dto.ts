import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  type ChannelInitiateResponse,
  ChannelOutcome,
  type ChannelStatusResponse,
  Currency,
} from '@ircub/shared';

export class InitiateResponseDto implements ChannelInitiateResponse {
  @ApiProperty({ example: 'BNK-7F3K2L9QZ1' })
  txnRef!: string;

  @ApiProperty({ enum: ChannelOutcome })
  status!: ChannelOutcome;
}

export class StatusResponseDto implements ChannelStatusResponse {
  @ApiProperty()
  txnRef!: string;

  @ApiProperty({ enum: ChannelOutcome })
  status!: ChannelOutcome;

  @ApiProperty()
  amount!: string;

  @ApiProperty({ enum: Currency })
  currency!: Currency;

  @ApiProperty()
  controlNumber!: string;

  @ApiPropertyOptional({ nullable: true })
  paidAt!: string | null;

  @ApiPropertyOptional({ description: "The caller's clientRef from initiation, when given" })
  clientRef?: string;
}
