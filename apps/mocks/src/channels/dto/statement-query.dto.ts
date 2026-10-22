import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class StatementQueryDto {
  @ApiProperty({ example: '2026-10-20' })
  @IsString()
  @Matches(DATE_PATTERN)
  date!: string;

  @ApiPropertyOptional({ description: 'Set to 1 for a deliberately perturbed statement' })
  @IsOptional()
  @IsString()
  perturb?: string;
}
