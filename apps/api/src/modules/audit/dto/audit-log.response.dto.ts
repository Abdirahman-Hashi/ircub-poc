import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { AuditAction } from '@ircub/shared';

export class AuditLogResponseDto {
  @ApiProperty({ example: '42' })
  seq!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  actorId!: string | null;

  @ApiProperty({
    example: 'officer@example.com',
    description: 'SYSTEM for jobs, crons and the seed',
  })
  actorEmail!: string;

  @ApiProperty({ example: 'User' })
  entity!: string;

  @ApiProperty()
  entityId!: string;

  @ApiProperty({ enum: AuditAction })
  action!: AuditAction;

  @ApiPropertyOptional({ nullable: true })
  before!: unknown;

  @ApiPropertyOptional({ nullable: true })
  after!: unknown;

  @ApiPropertyOptional({ nullable: true })
  ip!: string | null;

  @ApiPropertyOptional({ nullable: true })
  userAgent!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ description: 'sha256 hex' })
  hash!: string;

  @ApiProperty({ description: 'sha256 hex of the previous row' })
  prevHash!: string;
}
