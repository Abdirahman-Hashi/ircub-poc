import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

export class StatementQueryDto {
  @ApiPropertyOptional({ type: String, format: 'date', description: 'Default: 12 months ago' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({ type: String, format: 'date', description: 'Default: today' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
