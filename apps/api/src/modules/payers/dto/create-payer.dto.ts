import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

import { PayerType } from '@ircub/shared';

export class CreatePayerDto {
  @ApiProperty({ enum: PayerType })
  @IsEnum(PayerType)
  type!: PayerType;

  @ApiProperty({ example: 'Hodan Trading Co.' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registrationNo?: string;

  @ApiProperty({ example: '+252612345678', description: 'Normalised to E.164 on save' })
  @IsString()
  @MinLength(1)
  phone!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;
}
