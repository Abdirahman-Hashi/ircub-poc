import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MinLength } from 'class-validator';

export class CreateReversalDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  paymentId!: string;

  @ApiProperty({ example: 'Captured against the wrong control number' })
  @IsString()
  @MinLength(1)
  reason!: string;
}
