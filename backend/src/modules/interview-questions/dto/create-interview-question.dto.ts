import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateInterviewQuestionDto {
  @ApiProperty({ description: "Yo'nalish IDsi (subjects.id)", example: '1' })
  @IsString()
  @IsNotEmpty()
  subjectId!: string;

  @ApiProperty({ description: 'Savol matni' })
  @IsString()
  @IsNotEmpty()
  questionText!: string;

  @ApiProperty({ description: 'Kutilayotgan javob' })
  @IsString()
  @IsNotEmpty()
  expectedAnswer!: string;

  @ApiPropertyOptional({ description: 'Savol asosi (rationale)' })
  @IsString()
  @IsOptional()
  rationale?: string;
}
