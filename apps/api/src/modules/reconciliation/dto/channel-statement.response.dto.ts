import { ApiProperty } from '@nestjs/swagger';

import { PaymentChannel } from '@ircub/shared';

export class ChannelStatementResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: PaymentChannel }) channel!: PaymentChannel;
  @ApiProperty({ type: String, format: 'date' }) statementDate!: Date;
  @ApiProperty() fileName!: string;
  @ApiProperty() lineCount!: number;
  @ApiProperty() createdAt!: Date;
}
