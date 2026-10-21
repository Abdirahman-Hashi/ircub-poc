import { ApiProperty } from '@nestjs/swagger';

export class ResetResponseDto {
  @ApiProperty({ example: { payments: 3, journals: 1, outbox: 5, scenarios: 0 } })
  cleared!: Record<string, number>;
}
