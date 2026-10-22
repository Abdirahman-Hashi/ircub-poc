import { ApiProperty } from '@nestjs/swagger';

import type { GlMappingView } from '@ircub/shared';

class MappingRevenueTypeDto {
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
}

export class GlMappingResponseDto implements GlMappingView {
  @ApiProperty() id!: string;
  @ApiProperty() revenueTypeId!: string;
  @ApiProperty({ type: MappingRevenueTypeDto }) revenueType!: MappingRevenueTypeDto;
  @ApiProperty() glCode!: string;
  @ApiProperty() glName!: string;
  @ApiProperty({ type: String, format: 'date' }) effectiveFrom!: Date;
  @ApiProperty() createdAt!: Date;
}
