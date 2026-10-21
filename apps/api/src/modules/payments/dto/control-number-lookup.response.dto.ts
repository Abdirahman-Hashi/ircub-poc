import { ApiProperty } from '@nestjs/swagger';

import { AssessmentStatus, BillStatus, type ControlNumberLookup, Currency } from '@ircub/shared';

import { AssessmentPayerDto } from '../../assessments/dto/assessment.response.dto';

export class ControlNumberLookupResponseDto implements ControlNumberLookup {
  @ApiProperty()
  controlNumber!: string;

  @ApiProperty({ enum: ['ASSESSMENT', 'BILL'] })
  kind!: 'ASSESSMENT' | 'BILL';

  @ApiProperty({ type: AssessmentPayerDto })
  payer!: AssessmentPayerDto;

  @ApiProperty({ example: 'Business licence · 2026' })
  description!: string;

  @ApiProperty()
  amount!: string;

  @ApiProperty()
  paidAmount!: string;

  @ApiProperty()
  outstanding!: string;

  @ApiProperty({ enum: Currency })
  currency!: Currency;

  @ApiProperty({ enum: [...Object.values(AssessmentStatus), ...Object.values(BillStatus)] })
  status!: AssessmentStatus | BillStatus;
}
