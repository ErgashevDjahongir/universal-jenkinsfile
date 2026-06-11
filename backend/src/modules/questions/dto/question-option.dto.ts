import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class QuestionOptionDto {
  @ApiProperty({ example: 'Variant matni' })
  @IsString()
  @MinLength(1)
  text!: string;

  @ApiPropertyOptional({ description: 'To‘g‘ri variant (faqat server tomonida ishlatiladi)' })
  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;

  @ApiPropertyOptional({ description: 'ordering turida to‘g‘ri tartib' })
  @IsOptional()
  @IsInt()
  orderIndex?: number;

  @ApiPropertyOptional({ description: 'matching turida juftlik (o‘ng ustun)' })
  @IsOptional()
  @IsString()
  matchPair?: string;
}
