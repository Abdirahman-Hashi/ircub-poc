import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { Currency, FMIS } from '@ircub/shared';
import type { FmisJournalLine, FmisJournalRequest } from '@ircub/shared';

const MONEY_PATTERN = /^[0-9]+(\.[0-9]{1,2})?$/;

export class JournalLineDto implements FmisJournalLine {
  @ApiProperty({ example: '4100' })
  @Matches(FMIS.GL_CODE_PATTERN)
  glCode!: string;

  @ApiProperty({ example: '0.00' })
  @Matches(MONEY_PATTERN)
  debit!: string;

  @ApiProperty({ example: '2500.00' })
  @Matches(MONEY_PATTERN)
  credit!: string;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency!: Currency;

  @ApiProperty({ example: '000000012395' })
  @IsString()
  reference!: string;
}

export class PostJournalDto implements FmisJournalRequest {
  @ApiProperty({ description: 'Idempotency key' })
  @IsString()
  @MinLength(1)
  batchId!: string;

  @ApiProperty({ example: '2026-10-21' })
  @IsString()
  @MinLength(1)
  date!: string;

  @ApiProperty({ type: [JournalLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines!: JournalLineDto[];
}
