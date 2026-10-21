import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DecideReversalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
