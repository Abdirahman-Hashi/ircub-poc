import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { NotificationChannel, NotificationStatus, type NotificationView } from '@ircub/shared';

export class NotificationResponseDto implements NotificationView {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: NotificationChannel })
  channel!: NotificationChannel;

  @ApiProperty()
  to!: string;

  @ApiPropertyOptional({ nullable: true })
  subject!: string | null;

  @ApiProperty()
  body!: string;

  @ApiProperty({ enum: NotificationStatus })
  status!: NotificationStatus;

  @ApiPropertyOptional({ nullable: true })
  relatedType!: string | null;

  @ApiPropertyOptional({ nullable: true })
  relatedId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  sentAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  error!: string | null;

  @ApiProperty()
  createdAt!: Date;
}
