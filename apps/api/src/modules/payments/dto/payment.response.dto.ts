import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Currency, PaymentChannel, PaymentStatus, type PaymentView } from '@ircub/shared';

import {
  AssessmentPayerDto,
  AssessmentRevenueTypeDto,
} from '../../assessments/dto/assessment.response.dto';

export class PaymentResponseDto implements PaymentView {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  controlNumber!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  assessmentId!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  billId!: string | null;

  @ApiProperty({ type: AssessmentPayerDto })
  payer!: AssessmentPayerDto;

  @ApiPropertyOptional({ type: AssessmentRevenueTypeDto, nullable: true })
  revenueType!: AssessmentRevenueTypeDto | null;

  @ApiProperty({ enum: PaymentChannel })
  channel!: PaymentChannel;

  @ApiPropertyOptional({ nullable: true })
  channelTxnRef!: string | null;

  @ApiProperty({ example: '100.00' })
  amount!: string;

  @ApiProperty({ enum: Currency })
  currency!: Currency;

  @ApiProperty({ example: '571.500000' })
  fxRate!: string;

  @ApiProperty({ example: '57150.00' })
  localAmount!: string;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiPropertyOptional({ nullable: true })
  paidAt!: Date | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  capturedById!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  bulkUploadId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  failureReason!: string | null;

  @ApiProperty()
  createdAt!: Date;
}
