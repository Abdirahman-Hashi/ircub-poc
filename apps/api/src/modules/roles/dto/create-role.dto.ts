import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches, MinLength } from 'class-validator';

const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

export class CreateRoleDto {
  @ApiProperty({ example: 'CASHIER', description: 'UPPER_SNAKE_CASE, unique' })
  @IsString()
  @Matches(CODE_PATTERN)
  code!: string;

  @ApiProperty({ example: 'Cashier' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Role to inherit permissions from' })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
