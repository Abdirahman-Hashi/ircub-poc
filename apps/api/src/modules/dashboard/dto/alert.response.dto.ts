import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { AlertSeverity, AlertType } from '@ircub/shared';
import type { AlertView } from '@ircub/shared';

export class AlertResponseDto implements AlertView {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: AlertType }) type!: AlertType;
  @ApiProperty({ enum: AlertSeverity }) severity!: AlertSeverity;
  @ApiProperty() title!: string;
  @ApiProperty() message!: string;
  @ApiProperty() data!: unknown;
  @ApiProperty() createdAt!: Date;
  @ApiPropertyOptional({ nullable: true }) acknowledgedById!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  acknowledgedAt!: Date | null;
}
