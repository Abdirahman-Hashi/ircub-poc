import { ApiProperty } from '@nestjs/swagger';

import type { AssessmentDetail } from '@ircub/shared';

import { PaymentResponseDto } from '../../payments/dto/payment.response.dto';

import { AssessmentResponseDto } from './assessment.response.dto';

export class AssessmentDetailResponseDto extends AssessmentResponseDto implements AssessmentDetail {
  @ApiProperty({ type: [PaymentResponseDto] })
  payments!: PaymentResponseDto[];
}
