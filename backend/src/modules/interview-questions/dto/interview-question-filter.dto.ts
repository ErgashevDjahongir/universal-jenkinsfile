import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class InterviewQuestionFilterDto {
  @ApiPropertyOptional({ description: "Yo'nalish bo'yicha filtr (subject ID)" })
  @IsString()
  @IsOptional()
  subjectId?: string;

  @ApiPropertyOptional({ description: 'Savol matnida qidiruv' })
  @IsString()
  @IsOptional()
  search?: string;
}
