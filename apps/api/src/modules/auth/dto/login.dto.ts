import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@ircub.test' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Passw0rd!2026' })
  @IsString()
  @MinLength(1)
  password!: string;
}
