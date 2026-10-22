import { ApiProperty } from '@nestjs/swagger';

export class UnacknowledgedCountResponseDto {
  @ApiProperty() count!: number;
}
