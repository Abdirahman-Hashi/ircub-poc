import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class SetUserRolesDto {
  @ApiProperty({ type: [String], format: 'uuid', description: 'Full replacement set' })
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  roleIds!: string[];
}
