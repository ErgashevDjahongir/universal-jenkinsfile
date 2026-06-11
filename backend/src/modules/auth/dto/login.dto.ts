import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'superadmin', description: 'Foydalanuvchi login' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  login!: string;

  @ApiProperty({ example: 'StrongPass1', description: 'Parol' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
