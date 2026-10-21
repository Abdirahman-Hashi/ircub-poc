import { ApiProperty } from '@nestjs/swagger';

export class PermissionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'payments.capture' })
  code!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty({ example: 'Payments' })
  group!: string;
}
