import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import { ReconciliationLineStatus } from '@ircub/shared';

export class ReconciliationLineFilterDto {
  @ApiPropertyOptional({ enum: ReconciliationLineStatus })
  @IsOptional()
  @IsEnum(ReconciliationLineStatus)
  status?: ReconciliationLineStatus;
}
