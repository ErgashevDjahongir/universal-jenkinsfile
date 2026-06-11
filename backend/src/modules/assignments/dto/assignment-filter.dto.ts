import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional } from 'class-validator';

export class AssignmentFilterDto {
  @ApiPropertyOptional({ description: 'Shablon bo‘yicha filtr' })
  @IsOptional()
  @IsNumberString()
  templateId?: string;
}
