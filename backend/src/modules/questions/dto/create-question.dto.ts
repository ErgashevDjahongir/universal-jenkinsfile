import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { DifficultyLevel } from '../../../common/enums/difficulty-level.enum';
import { QuestionType } from '../../../common/enums/question-type.enum';
import { QuestionOptionDto } from './question-option.dto';

export class CreateQuestionDto {
  @ApiProperty({ example: '1', description: 'Fan id' })
  @IsNumberString()
  subjectId!: string;

  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  type!: QuestionType;

  @ApiPropertyOptional({ enum: DifficultyLevel, default: DifficultyLevel.MEDIUM })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @ApiProperty({ description: 'Savol matni' })
  @IsString()
  @MinLength(1)
  text!: string;

  @ApiPropertyOptional({ description: 'Individual ball; berilmasa qiyinlik bo‘yicha standart' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  points?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({ description: 'short_answer: vergul bilan ajratilgan qabul variantlari' })
  @IsOptional()
  @IsString()
  answerKey?: string;

  @ApiPropertyOptional({ type: [String], description: 'Kategoriya id-lari' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsNumberString({}, { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ type: [QuestionOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];
}
