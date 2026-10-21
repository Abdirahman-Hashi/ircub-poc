import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { SystemConfigEntryView } from '@ircub/shared';

import { SystemConfigKey } from '../system-config.keys';

export class SystemConfigEntryResponseDto implements SystemConfigEntryView {
  @ApiProperty({ enum: SystemConfigKey })
  key!: SystemConfigKey;

  @ApiProperty({ description: 'Current value (number or string)' })
  value!: unknown;

  @ApiProperty()
  defaultValue!: unknown;

  @ApiProperty()
  description!: string;

  @ApiPropertyOptional({ nullable: true })
  updatedAt!: Date | null;
}
