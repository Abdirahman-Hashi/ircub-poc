import { ApiProperty } from '@nestjs/swagger';
import { IsDefined } from 'class-validator';

export class UpdateSystemConfigDto {
  @ApiProperty({
    description: 'Must have the same primitive type as the key’s default',
    example: 200,
  })
  @IsDefined()
  value!: unknown;
}
