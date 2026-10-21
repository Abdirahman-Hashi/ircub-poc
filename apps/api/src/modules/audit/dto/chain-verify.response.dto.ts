import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChainVerifyResponseDto {
  @ApiProperty()
  ok!: boolean;

  @ApiProperty({ description: 'Rows recomputed' })
  checked!: number;

  @ApiPropertyOptional({ description: 'First sequence number whose hash or link is wrong' })
  firstBrokenSeq?: number;
}
