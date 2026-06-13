import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCandidateDto {
  @ApiPropertyOptional({ description: 'F.I.Sh. (familiya ism sharif)' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fullName?: string;

  @ApiPropertyOptional({ description: 'Telefon raqami' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  phone?: string;
}
