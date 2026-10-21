import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';

const MAX_DIAL_DIGITS = 9;

export class CreateWaterAccountDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  payerId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  tariffCategoryId!: string;

  @ApiProperty({ example: 'Plot 12, Hodan district' })
  @IsString()
  @MinLength(1)
  serviceAddress!: string;

  @ApiPropertyOptional({
    description: 'Serial of the meter installed with the account; omit to add one later',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  meterSerial?: string;

  @ApiPropertyOptional({ default: 6 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_DIAL_DIGITS)
  maxDigits?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  initialReading?: number;
}
