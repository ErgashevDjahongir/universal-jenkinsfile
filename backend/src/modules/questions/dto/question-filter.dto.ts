import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumberString, IsOptional } from 'class-validator';
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
}
