import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class FlagNoteDto {
  @ApiProperty({ example: 'Reading verified on site' })
  @IsString()
  @MinLength(1)
  note!: string;
}
