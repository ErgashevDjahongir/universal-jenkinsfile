import { BadRequestException } from '@nestjs/common';
import { QuestionType } from '../../common/enums/question-type.enum';
import { messages } from '../../i18n/uz';
import { QuestionOptionDto } from './dto/question-option.dto';

/**
 * Savol turi bo'yicha variantlar/answer_key to'g'riligini tekshiradi.
 * Sof funksiya (DB'siz) — unit test qilinadi.
 */
export function validateQuestionShape(
  type: QuestionType,
  options: QuestionOptionDto[] | undefined,
  answerKey: string | undefined | null,
): void {
  const opts = options ?? [];
  const correctCount = opts.filter((o) => o.isCorrect).length;

  switch (type) {
    case QuestionType.SINGLE_CHOICE:
    case QuestionType.TRUE_FALSE: {
      const required = type === QuestionType.TRUE_FALSE ? 2 : 2;
      if (opts.length < required) {
        throw new BadRequestException(messages.question.optionsRequired);
      }
      if (correctCount !== 1) {
        throw new BadRequestException(messages.question.oneCorrectRequired);
      }
      break;
    }
    case QuestionType.MULTIPLE_CHOICE: {
      if (opts.length < 2) {
        throw new BadRequestException(messages.question.optionsRequired);
      }
      if (correctCount < 1) {
        throw new BadRequestException(messages.question.atLeastOneCorrect);
      }
      break;
    }
    case QuestionType.MATCHING: {
      if (opts.length < 2) {
        throw new BadRequestException(messages.question.optionsRequired);
      }
      if (opts.some((o) => !o.matchPair || o.matchPair.trim() === '')) {
        throw new BadRequestException(messages.question.matchingPairsRequired);
      }
      break;
    }
    case QuestionType.ORDERING: {
      if (opts.length < 2) {
        throw new BadRequestException(messages.question.optionsRequired);
      }
      break;
    }
    case QuestionType.SHORT_ANSWER: {
      if (!answerKey || answerKey.trim() === '') {
        throw new BadRequestException(messages.question.answerKeyRequired);
      }
      break;
    }
  }
}

/**
 * short_answer answer_key normalizatsiyasi (qaror §5): trim + lowercase +
 * ketma-ket bo'shliqlarni bittaga. Baholash bosqichida (faza 8) ishlatiladi,
 * shu yerda saqlanadi va qayta foydalanish uchun eksport qilinadi.
 */
export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** answer_key matnini qabul qilinadigan normallashtirilgan variantlar ro'yxatiga aylantiradi. */
export function parseAnswerKey(answerKey: string): string[] {
  return answerKey
    .split(',')
    .map((part) => normalizeAnswer(part))
    .filter((part) => part.length > 0);
}
