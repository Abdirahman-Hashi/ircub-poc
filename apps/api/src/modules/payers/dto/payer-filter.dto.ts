import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { PayerStatus, PayerType } from '@ircub/shared';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class PayerFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Matches name, TIN or phone' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: PayerType })
  @IsOptional()
  @IsEnum(PayerType)
  type?: PayerType;

  @ApiPropertyOptional({ enum: PayerStatus })
  @IsOptional()
  @IsEnum(PayerStatus)
  status?: PayerStatus;
}
