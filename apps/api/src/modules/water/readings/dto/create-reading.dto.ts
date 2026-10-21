import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

import { ReadingType } from '@ircub/shared';

export class CreateReadingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  meterId!: string;

  @ApiProperty({ type: String, format: 'date' })
  @Type(() => Date)
  @IsDate()
  readingDate!: Date;

  @ApiProperty({ example: 12345 })
  @IsInt()
  @Min(0)
  readingValue!: number;

  @ApiPropertyOptional({ enum: ReadingType, default: ReadingType.NORMAL })
  @IsOptional()
  @IsEnum(ReadingType)
  type?: ReadingType;
}
