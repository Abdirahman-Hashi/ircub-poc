import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class JournalLineQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  paymentId?: string;

  @ApiPropertyOptional({ example: '000000012395' })
  @IsOptional()
  @IsString()
  controlNumber?: string;
}
