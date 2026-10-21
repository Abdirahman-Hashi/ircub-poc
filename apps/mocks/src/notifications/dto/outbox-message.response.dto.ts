import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OutboxMessageResponseDto {
  @ApiProperty({ enum: ['SMS', 'EMAIL'] })
  channel!: string;

  @ApiProperty()
  to!: string;

  @ApiPropertyOptional()
  subject?: string;

  @ApiProperty()
  body!: string;

  @ApiProperty()
  sentAt!: string;
}
