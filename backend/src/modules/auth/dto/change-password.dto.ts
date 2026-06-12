import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Joriy parol' })
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @ApiProperty({
    description: 'Yangi parol — kamida 8 belgi, kamida bitta harf va bitta raqam',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Yangi parol kamida 8 belgidan iborat bo’lishi kerak' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'Yangi parol kamida bitta harf va bitta raqamni o’z ichiga olishi kerak',
  })
  newPassword!: string;
}
