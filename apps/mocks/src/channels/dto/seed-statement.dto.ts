import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsString, MinLength, ValidateNested } from 'class-validator';

import {
  Currency,
  PaymentChannel,
  type SeedStatementLine,
  type SeedStatementRequest,
} from '@ircub/shared';

export class SeedStatementLineDto implements SeedStatementLine {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  txnRef!: string;

  @ApiProperty({ example: '2026-10-20' })
  @IsString()
  @MinLength(1)
  date!: string;

  @ApiProperty({ example: '100.00' })
  @IsString()
  @MinLength(1)
  amount!: string;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency!: Currency;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  controlNumber!: string;
}

export class SeedStatementDto implements SeedStatementRequest {
  @ApiProperty({ enum: [PaymentChannel.BANK, PaymentChannel.MOBILE_MONEY] })
  @IsEnum(PaymentChannel)
  channel!: PaymentChannel;

  @ApiProperty({ type: [SeedStatementLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeedStatementLineDto)
  lines!: SeedStatementLineDto[];
}
