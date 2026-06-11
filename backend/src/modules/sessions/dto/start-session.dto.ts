import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';

/**
 * Kod orqali kirish (qaror §6). Kodga foydalanuvchi oldindan biriktirilgan bo'lsa
 * F.I.Sh./telefon e'tiborga olinmaydi; aks holda (anonim kod) ular talab qilinadi
 * va yangi examinee yaratiladi.
 */
export class StartSessionDto {
  @ApiProperty({ description: 'Bir martalik kirish kodi' })
  @IsString()
  @Length(1, 20)
  code!: string;

  @ApiPropertyOptional({ description: 'Familiya (anonim kod uchun majburiy)' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Ism (anonim kod uchun majburiy)' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Otasining ismi' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  middleName?: string;

  @ApiPropertyOptional({ description: 'Telefon (anonim kod uchun majburiy)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
