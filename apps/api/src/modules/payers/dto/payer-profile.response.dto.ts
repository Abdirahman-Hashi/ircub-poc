import { ApiProperty } from '@nestjs/swagger';

import type { PayerBalances, PayerProfile } from '@ircub/shared';

import { AssessmentResponseDto } from '../../assessments/dto/assessment.response.dto';
import { PaymentResponseDto } from '../../payments/dto/payment.response.dto';

import { PayerResponseDto } from './payer.response.dto';

export class PayerBalancesDto implements PayerBalances {
  @ApiProperty({ example: '125000.00' })
  assessedTotal!: string;

  @ApiProperty({ example: '80000.00' })
  paidTotal!: string;

  @ApiProperty({ example: '45000.00' })
  outstanding!: string;
}

export class PayerProfileResponseDto implements PayerProfile {
  @ApiProperty({ type: PayerResponseDto })
  payer!: PayerResponseDto;

  @ApiProperty({ type: [AssessmentResponseDto] })
  assessments!: AssessmentResponseDto[];

  @ApiProperty({ type: [Object], description: 'Filled in phase 3' })
  waterAccounts!: unknown[];

  @ApiProperty({ type: [PaymentResponseDto], description: 'Most recent 20' })
  payments!: PaymentResponseDto[];

  @ApiProperty({ type: PayerBalancesDto })
  balances!: PayerBalancesDto;
}
