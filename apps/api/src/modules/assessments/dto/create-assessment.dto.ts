import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

import { MONEY_PATTERN } from '../assessments.constants';

export class CreateAssessmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  payerId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  revenueTypeId!: string;

  @ApiPropertyOptional({ example: '2000000.00', description: 'Required for PERCENT revenue types' })
  @IsOptional()
  @IsString()
  @Matches(MONEY_PATTERN)
  baseAmount?: string;

  @ApiPropertyOptional({ example: '2026' })
  @IsOptional()
  @IsString()
  period?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Defaults to ASSESSMENT_DEFAULT_DUE_DAYS from today',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
