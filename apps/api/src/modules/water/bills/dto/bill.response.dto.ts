import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { BillStatus, type BillView, Currency, type TierLine } from '@ircub/shared';

import { AssessmentPayerDto } from '../../../assessments/dto/assessment.response.dto';

export class BillAccountDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  accountNumber!: string;

  @ApiProperty()
  serviceAddress!: string;
}

export class TierLineDto implements TierLine {
  @ApiProperty()
  from!: number;

  @ApiPropertyOptional({ nullable: true })
  to!: number | null;

  @ApiProperty()
  units!: number;

  @ApiProperty()
  rate!: string;

  @ApiProperty()
  amount!: string;
}

export class BillResponseDto implements BillView {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Control number' })
  billNumber!: string;

  @ApiProperty({ format: 'uuid' })
  cycleId!: string;

  @ApiProperty({ example: '2026-09' })
  period!: string;

  @ApiProperty({ type: BillAccountDto })
  account!: BillAccountDto;

  @ApiProperty({ type: AssessmentPayerDto })
  payer!: AssessmentPayerDto;

  @ApiProperty()
  periodStart!: Date;

  @ApiProperty()
  periodEnd!: Date;

  @ApiProperty()
  previousReading!: number;

  @ApiProperty()
  currentReading!: number;

  @ApiProperty()
  consumption!: number;

  @ApiProperty({ type: [TierLineDto] })
  tierBreakdown!: TierLineDto[];

  @ApiProperty()
  consumptionCharge!: string;

  @ApiProperty()
  fixedCharge!: string;

  @ApiProperty()
  arrears!: string;

  @ApiProperty()
  paymentsApplied!: string;

  @ApiProperty()
  totalDue!: string;

  @ApiProperty()
  paidAmount!: string;

  @ApiProperty()
  outstanding!: string;

  @ApiProperty({ enum: Currency })
  currency!: Currency;

  @ApiProperty({ enum: BillStatus })
  status!: BillStatus;

  @ApiProperty()
  flagged!: boolean;

  @ApiPropertyOptional({ nullable: true })
  flagReason!: string | null;

  @ApiPropertyOptional({ nullable: true })
  flagNote!: string | null;

  @ApiProperty()
  hasPdf!: boolean;

  @ApiProperty()
  dueDate!: Date;

  @ApiPropertyOptional({ nullable: true })
  releasedAt!: Date | null;
}
