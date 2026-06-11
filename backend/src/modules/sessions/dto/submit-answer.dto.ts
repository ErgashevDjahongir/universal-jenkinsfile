import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumberString, IsOptional, IsString, ValidateNested } from 'class-validator';
import { MatchPairDto } from './match-pair.dto';

/**
 * Bitta savolga javob (turiga qarab biri to'ldiriladi):
 * - single/multiple/true_false: `selectedOptionIds`
 * - ordering: `selectedOptionIds` (tanlangan tartibda)
 * - matching: `matchPairs`
 * - short_answer: `answerText`
 * To'g'ri javob hech qachon so'ralmaydi/qaytarilmaydi — tekshiruv faqat serverda.
 */
export class SubmitAnswerDto {
  @ApiPropertyOptional({ type: [String], description: 'Tanlangan variant id-lari' })
  @IsOptional()
  @IsArray()
  @IsNumberString({}, { each: true })
  selectedOptionIds?: string[];

  @ApiPropertyOptional({ type: [MatchPairDto], description: 'Moslashtirish juftliklari' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MatchPairDto)
  matchPairs?: MatchPairDto[];

  @ApiPropertyOptional({ description: 'Qisqa javob matni' })
  @IsOptional()
  @IsString()
  answerText?: string;
}
