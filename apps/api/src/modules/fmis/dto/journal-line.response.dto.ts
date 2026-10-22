import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Currency, PaymentChannel } from '@ircub/shared';
import type { JournalLinePayment, JournalLineView } from '@ircub/shared';

class LinePayerDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() tin!: string;
}

class LinePaymentDto implements JournalLinePayment {
  @ApiProperty() id!: string;
  @ApiProperty() controlNumber!: string;
  @ApiProperty({ enum: PaymentChannel }) channel!: PaymentChannel;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' }) paidAt!: Date | null;
  @ApiProperty({ type: LinePayerDto }) payer!: LinePayerDto;
}

class LineRevenueTypeDto {
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
}

export class JournalLineResponseDto implements JournalLineView {
  @ApiProperty() id!: string;
  @ApiProperty() batchId!: string;
  @ApiPropertyOptional({ nullable: true }) paymentId!: string | null;
  @ApiPropertyOptional({ nullable: true }) reversalId!: string | null;
  @ApiProperty({ type: LineRevenueTypeDto }) revenueType!: LineRevenueTypeDto;
  @ApiProperty() glCode!: string;
  @ApiProperty() debitGl!: string;
  @ApiProperty() creditGl!: string;
  @ApiProperty() amount!: string;
  @ApiProperty({ enum: Currency }) currency!: Currency;
  @ApiProperty() reference!: string;
  @ApiProperty() reversed!: boolean;
  @ApiPropertyOptional({ type: LinePaymentDto, nullable: true }) payment!: LinePaymentDto | null;
}
