import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

import { AssessmentStatus } from '@ircub/shared';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { MONEY_PATTERN } from '../assessments.constants';

/** Brief Module 3.5 "advanced filters": payer, revenue type, amount range, status, date ranges. */
export class AssessmentFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  payerId?: string;

  @ApiPropertyOptional({ example: 'TIN1234567890' })
  @IsOptional()
  @IsString()
  tin?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  revenueTypeId?: string;

  @ApiPropertyOptional({ example: '1000.00' })
  @IsOptional()
  @Matches(MONEY_PATTERN)
  amountMin?: string;

  @ApiPropertyOptional({ example: '50000.00' })
  @IsOptional()
  @Matches(MONEY_PATTERN)
  amountMax?: string;

  @ApiPropertyOptional({ enum: AssessmentStatus })
  @IsOptional()
  @IsEnum(AssessmentStatus)
  status?: AssessmentStatus;

  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'createdAt ≥' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateFrom?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'createdAt ≤' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateTo?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueFrom?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueTo?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  controlNumber?: string;
}
