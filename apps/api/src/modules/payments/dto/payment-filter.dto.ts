import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

import { Currency, PaymentChannel, PaymentStatus } from '@ircub/shared';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { MONEY_PATTERN } from '../../assessments/assessments.constants';

export class PaymentFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  payerId?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Via the assessment' })
  @IsOptional()
  @IsUUID()
  revenueTypeId?: string;

  @ApiPropertyOptional({ description: 'Local amount ≥' })
  @IsOptional()
  @Matches(MONEY_PATTERN)
  amountMin?: string;

  @ApiPropertyOptional({ description: 'Local amount ≤' })
  @IsOptional()
  @Matches(MONEY_PATTERN)
  amountMax?: string;

  @ApiPropertyOptional({ enum: PaymentChannel })
  @IsOptional()
  @IsEnum(PaymentChannel)
  channel?: PaymentChannel;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ enum: Currency })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'paidAt ≥' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateFrom?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'paidAt ≤' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateTo?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  controlNumber?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Payments created by one bulk upload' })
  @IsOptional()
  @IsUUID()
  bulkUploadId?: string;
}
