import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ControlNumberLookupDto {
  @ApiProperty({ example: '000000012395' })
  @IsString()
  @MinLength(1)
  controlNumber!: string;
}
