import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

import { UserStatus } from '@ircub/shared';

import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class UserFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Matches email or full name (case-insensitive)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  roleId?: string;
}
