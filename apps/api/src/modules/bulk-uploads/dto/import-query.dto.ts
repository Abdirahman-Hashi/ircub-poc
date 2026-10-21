import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class ImportQueryDto {
  @ApiPropertyOptional({
    default: false,
    description: 'Validate every row and report, but persist nothing',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  dryRun?: boolean;
}
