import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCandidateDto {
  @ApiProperty({ description: 'F.I.Sh. (familiya ism sharif)', example: 'Karimov Aziz Akmalovich' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fullName!: string;

  @ApiProperty({ description: 'Telefon raqami', example: '+998901234567' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  phone!: string;
}
