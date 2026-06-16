import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';
import { DifficultyLevel } from '../../../common/enums/difficulty-level.enum';
import { QuestionStatus } from '../../../common/enums/question-status.enum';
import { QuestionType } from '../../../common/enums/question-type.enum';

export class QuestionFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  subjectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  categoryId?: string;

  @ApiPropertyOptional({ enum: QuestionStatus })
  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;

  @ApiPropertyOptional({ enum: DifficultyLevel })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @ApiPropertyOptional({ enum: QuestionType })
  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @ApiPropertyOptional({ description: 'Savol matnida qidiruv (case-insensitive, qisman moslik).' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ description: 'Sahifa raqami (1-dan). Berilmasa — 1.' })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ description: 'Sahifadagi yozuvlar soni. Berilmasa — barchasi.' })
  @IsOptional()
  @IsNumberString()
  limit?: string;
}
