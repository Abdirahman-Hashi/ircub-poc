import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { AssessmentStatus, type AssessmentView, Currency } from '@ircub/shared';

export class AssessmentPayerDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  tin!: string;

  @ApiProperty()
  name!: string;
}

export class AssessmentRevenueTypeDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;
}

export class AssessmentResponseDto implements AssessmentView {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: '000000012395' })
  controlNumber!: string;

  @ApiProperty({ type: AssessmentPayerDto })
  payer!: AssessmentPayerDto;

  @ApiProperty({ type: AssessmentRevenueTypeDto })
  revenueType!: AssessmentRevenueTypeDto;

  @ApiPropertyOptional({ nullable: true })
  period!: string | null;

  @ApiPropertyOptional({ nullable: true, example: '2000000.00' })
  baseAmount!: string | null;

  @ApiProperty({ example: '10000.00' })
  amount!: string;

  @ApiProperty({ enum: Currency })
  currency!: Currency;

  @ApiProperty()
  dueDate!: Date;

  @ApiProperty({ enum: AssessmentStatus })
  status!: AssessmentStatus;

  @ApiProperty({ example: '4000.00' })
  paidAmount!: string;

  @ApiProperty({ example: '6000.00' })
  outstanding!: string;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;

  @ApiProperty()
  createdAt!: Date;
}
