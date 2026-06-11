import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsNumberString, IsOptional, Min } from 'class-validator';

/** Qo'lda tanlanadigan (majburiy) savol. */
export class FixedQuestionDto {
  @ApiProperty({ example: '1', description: 'Savol id' })
  @IsNumberString()
  questionId!: string;

  @ApiPropertyOptional({
    description: 'Shablon ichida balni qayta belgilash; berilmasa bankdagi ball',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  pointsOverride?: number;
}
