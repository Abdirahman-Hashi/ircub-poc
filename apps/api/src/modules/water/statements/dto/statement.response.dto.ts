import { ApiProperty } from '@nestjs/swagger';

import {
  Currency,
  type StatementLine,
  type StatementLineKind,
  type StatementView,
} from '@ircub/shared';

import { AssessmentPayerDto } from '../../../assessments/dto/assessment.response.dto';
import { BillAccountDto } from '../../bills/dto/bill.response.dto';

export class StatementLineDto implements StatementLine {
  @ApiProperty()
  date!: Date;

  @ApiProperty({ enum: ['OPENING', 'BILL', 'PAYMENT'] })
  kind!: StatementLineKind;

  @ApiProperty()
  reference!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  debit!: string;

  @ApiProperty()
  credit!: string;

  @ApiProperty()
  balance!: string;
}

export class StatementResponseDto implements StatementView {
  @ApiProperty({ type: BillAccountDto })
  account!: BillAccountDto;

  @ApiProperty({ type: AssessmentPayerDto })
  payer!: AssessmentPayerDto;

  @ApiProperty()
  from!: Date;

  @ApiProperty()
  to!: Date;

  @ApiProperty({ enum: Currency })
  currency!: Currency;

  @ApiProperty()
  openingBalance!: string;

  @ApiProperty()
  closingBalance!: string;

  @ApiProperty({ type: [StatementLineDto] })
  lines!: StatementLineDto[];
}
