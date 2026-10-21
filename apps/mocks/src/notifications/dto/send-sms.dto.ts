import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SendSmsDto {
  @ApiProperty({ example: '+252612345678' })
  @IsString()
  @MinLength(1)
  to!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  body!: string;
}
