import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumberString, IsOptional, Max, Min } from 'class-validator';
import { DifficultyLevel } from '../../../common/enums/difficulty-level.enum';

/** Avtomatik tanlash qoidasi: «X fan/kategoriyadan, Y darajada, N ta savol». */
export class SelectionRuleDto {
  @ApiProperty({ example: '1', description: 'Fan id' })
  @IsNumberString()
  subjectId!: string;

  @ApiPropertyOptional({ example: '5', description: 'Kategoriya id; berilmasa fanning hammasidan' })
  @IsOptional()
  @IsNumberString()
  categoryId?: string;

  @ApiPropertyOptional({ enum: DifficultyLevel, description: 'Berilmasa istalgan qiyinlik' })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @ApiProperty({ description: 'Shu qoida bo‘yicha tanlanadigan savollar soni' })
  @IsInt()
  @Min(1)
  @Max(500)
  questionCount!: number;
}
