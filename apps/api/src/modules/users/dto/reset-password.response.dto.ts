import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordResponseDto {
  @ApiProperty({ description: 'Shown once' })
  temporaryPassword!: string;
}
