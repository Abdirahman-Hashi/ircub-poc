import { ApiProperty } from '@nestjs/swagger';

import type { PayerBalances, PayerProfile, PayerWaterSummary } from '@ircub/shared';

import { AssessmentResponseDto } from '../../assessments/dto/assessment.response.dto';
import { PaymentResponseDto } from '../../payments/dto/payment.response.dto';
import { WaterAccountResponseDto } from '../../water/accounts/dto/water-account.response.dto';
import { BillResponseDto } from '../../water/bills/dto/bill.response.dto';

import { PayerResponseDto } from './payer.response.dto';

export class PayerBalancesDto implements PayerBalances {
  @ApiProperty({ example: '125000.00' })
  assessedTotal!: string;

  @ApiProperty({ example: '80000.00' })
  paidTotal!: string;

  @ApiProperty({ example: '45000.00' })
  outstanding!: string;
}

export class PayerWaterSummaryDto implements PayerWaterSummary {
  @ApiProperty({ type: WaterAccountResponseDto })
  account!: WaterAccountResponseDto;

  @ApiProperty({ type: [BillResponseDto] })
  bills!: BillResponseDto[];
}

export class PayerProfileResponseDto implements PayerProfile {
  @ApiProperty({ type: PayerResponseDto })
  payer!: PayerResponseDto;

  @ApiProperty({ type: [AssessmentResponseDto] })
  assessments!: AssessmentResponseDto[];

  @ApiProperty({ type: [PayerWaterSummaryDto] })
  waterAccounts!: PayerWaterSummaryDto[];

  @ApiProperty({ type: [PaymentResponseDto], description: 'Most recent 20' })
  payments!: PaymentResponseDto[];

  @ApiProperty({ type: PayerBalancesDto })
  balances!: PayerBalancesDto;
}
