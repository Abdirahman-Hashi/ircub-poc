import { ApiProperty } from '@nestjs/swagger';

import { WaterAccountStatus, type WaterAccountView } from '@ircub/shared';

import { AssessmentPayerDto } from '../../../assessments/dto/assessment.response.dto';
import { MeterResponseDto } from '../../meters/dto/meter.response.dto';

export class WaterAccountTariffDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;
}

export class WaterAccountResponseDto implements WaterAccountView {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'WA12345678' })
  accountNumber!: string;

  @ApiProperty({ type: AssessmentPayerDto })
  payer!: AssessmentPayerDto;

  @ApiProperty({ type: WaterAccountTariffDto })
  tariffCategory!: WaterAccountTariffDto;

  @ApiProperty()
  serviceAddress!: string;

  @ApiProperty({ enum: WaterAccountStatus })
  status!: WaterAccountStatus;

  @ApiProperty()
  openedAt!: Date;

  @ApiProperty({ type: [MeterResponseDto] })
  meters!: MeterResponseDto[];

  @ApiProperty({ description: 'Outstanding on released bills' })
  outstanding!: string;
}
