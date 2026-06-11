import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { NavigationMode } from '../../../common/enums/navigation-mode.enum';
import { ResultVisibility } from '../../../common/enums/result-visibility.enum';
import { FixedQuestionDto } from './fixed-question.dto';
import { GradeScaleItemDto } from './grade-scale-item.dto';
import { SelectionRuleDto } from './selection-rule.dto';

export class CreateTemplateDto {
  @ApiProperty({ description: 'Shablon nomi' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: 60, description: 'Vaqt limiti (daqiqa, 1–600)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  timeLimitMinutes?: number;

  @ApiPropertyOptional({ default: 60, description: 'O‘tish bali (foiz, 0–100)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  passingScorePercent?: number;

  @ApiPropertyOptional({ default: 1, description: 'Urinishlar soni (≥1)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number;

  @ApiPropertyOptional({
    default: 0,
    description: 'Urinishlar orasidagi minimal interval (daqiqa)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  attemptIntervalMinutes?: number;

  @ApiPropertyOptional({ enum: NavigationMode, default: NavigationMode.FREE })
  @IsOptional()
  @IsEnum(NavigationMode)
  navigation?: NavigationMode;

  @ApiPropertyOptional({ enum: ResultVisibility, default: ResultVisibility.IMMEDIATELY_SCORE })
  @IsOptional()
  @IsEnum(ResultVisibility)
  resultVisibility?: ResultVisibility;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  shuffleOptions?: boolean;

  @ApiPropertyOptional({ default: false, description: 'Ko‘p javobli savolda qisman ball' })
  @IsOptional()
  @IsBoolean()
  partialScoring?: boolean;

  @ApiPropertyOptional({ default: false, description: 'Jarima ball rejimi' })
  @IsOptional()
  @IsBoolean()
  negativeMarking?: boolean;

  @ApiPropertyOptional({ default: 0, description: 'Noto‘g‘ri javob uchun ayriladigan ball (≥0)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  negativePoints?: number;

  @ApiPropertyOptional({
    default: true,
    description: 'Qayta topshirishda savollar takrorlanmasligi (yumshoq)',
  })
  @IsOptional()
  @IsBoolean()
  avoidRepeatQuestions?: boolean;

  @ApiPropertyOptional({
    default: 3,
    description: 'Ruxsat etilgan tab almashtirishlar; oshsa avtoyakun',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxTabSwitches?: number;

  @ApiPropertyOptional({ type: [GradeScaleItemDto], description: 'Darajali baholash shkalasi' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeScaleItemDto)
  gradeScale?: GradeScaleItemDto[];

  @ApiPropertyOptional({
    type: [FixedQuestionDto],
    description: 'Qo‘lda tanlangan majburiy savollar',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FixedQuestionDto)
  fixedQuestions?: FixedQuestionDto[];

  @ApiPropertyOptional({ type: [SelectionRuleDto], description: 'Avtomatik tanlash qoidalari' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectionRuleDto)
  selectionRules?: SelectionRuleDto[];
}
