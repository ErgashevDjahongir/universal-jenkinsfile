import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * Tayinlovni tahrirlash — faqat nomi va faollik oynasi.
 * Shablon va maqsadlar o'zgartirilmaydi (kodlar/sessiyalar bilan bog'liqlik buzilmasin).
 */
export class UpdateAssignmentDto {
  @ApiPropertyOptional({ description: 'Tayinlov nomi' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional({ description: 'Faollik oynasi boshlanishi (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ description: 'Faollik oynasi tugashi (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;
}
