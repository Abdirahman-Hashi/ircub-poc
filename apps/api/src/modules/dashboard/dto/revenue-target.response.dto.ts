import { ApiProperty } from '@nestjs/swagger';

import type { RevenueTargetView } from '@ircub/shared';

class TargetRevenueTypeDto {
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
}

export class RevenueTargetResponseDto implements RevenueTargetView {
  @ApiProperty() id!: string;
  @ApiProperty() period!: string;
  @ApiProperty() revenueTypeId!: string;
  @ApiProperty({ type: TargetRevenueTypeDto }) revenueType!: TargetRevenueTypeDto;
  @ApiProperty() amount!: string;
}
