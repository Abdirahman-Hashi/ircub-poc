import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ReversalStatus, type ReversalView } from '@ircub/shared';

import { PaymentResponseDto } from '../../payments/dto/payment.response.dto';

export class ReversalResponseDto implements ReversalView {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: PaymentResponseDto })
  payment!: PaymentResponseDto;

  @ApiProperty()
  reason!: string;

  @ApiProperty({ format: 'uuid' })
  capturedById!: string;

  @ApiPropertyOptional({ nullable: true })
  capturedByEmail!: string | null;

  @ApiProperty({ enum: ReversalStatus })
  status!: ReversalStatus;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  approvedById!: string | null;

  @ApiPropertyOptional({ nullable: true })
  decidedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  decisionNote!: string | null;

  @ApiProperty()
  createdAt!: Date;
}
