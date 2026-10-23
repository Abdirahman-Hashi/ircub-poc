import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsEmail, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'clerk@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Asha Warsame' })
  @IsString()
  @MinLength(1)
  fullName!: string;

  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  roleIds!: string[];
}
