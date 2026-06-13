import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateCandidateAssignmentDto {
  @ApiPropertyOptional({ description: 'Test shabloni id (faqat «active» shablon)' })
  @IsOptional()
  @IsNumberString()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Tayinlov nomi' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
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
