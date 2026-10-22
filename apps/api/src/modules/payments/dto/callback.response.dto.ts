import { ApiProperty } from '@nestjs/swagger';

import { PaymentStatus } from '@ircub/shared';

export class CallbackResponseDto {
  @ApiProperty()
  paymentId!: string;

  @ApiProperty({ description: 'True when the payment was already terminal (idempotent replay)' })
  duplicate!: boolean;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;
}
