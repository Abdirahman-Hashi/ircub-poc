import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Seeded demo users are listed in the README',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'correct-horse-battery-staple',
    description: 'Policy: minimum length from SystemConfig, upper, lower, digit and symbol',
  })
  @IsString()
  @MinLength(1)
  password!: string;
}
