import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

const MAX_DIAL_DIGITS = 9;

export class ReplaceMeterDto {
  @ApiProperty({ example: 'MTR-000500' })
  @IsString()
  @MinLength(1)
  newSerial!: string;

  @ApiProperty({ default: 0, description: 'Reading shown on the new meter at installation' })
  @IsInt()
  @Min(0)
  initialReading!: number;

  @ApiPropertyOptional({ default: 6 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_DIAL_DIGITS)
  maxDigits?: number;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  installedAt?: Date;
}
