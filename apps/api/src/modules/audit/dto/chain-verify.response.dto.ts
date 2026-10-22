import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChainVerifyResponseDto {
  @ApiProperty()
  ok!: boolean;

  @ApiProperty({ description: 'Rows recomputed' })
  checked!: number;

  @ApiPropertyOptional({
    description:
      'First sequence number whose hash or link is wrong, or that is missing from the tail',
  })
  firstBrokenSeq?: number;

  @ApiPropertyOptional({ description: 'Last sequence number recorded by the chain head' })
  headSeq?: number;
}
