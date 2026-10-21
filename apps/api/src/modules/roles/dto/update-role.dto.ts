import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MinLength, ValidateIf } from 'class-validator';

export class UpdateRoleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true, description: 'null removes the parent' })
  @ValidateIf((_object, value) => value !== null)
  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}
