import { ApiProperty } from '@nestjs/swagger';

import { PermissionResponseDto } from './permission.response.dto';

export class PermissionGroupResponseDto {
  @ApiProperty({ example: 'Payments' })
  group!: string;

  @ApiProperty({ type: [PermissionResponseDto] })
  permissions!: PermissionResponseDto[];
}
