import { BadRequestException } from '@nestjs/common';
import { QuestionType } from '../../common/enums/question-type.enum';
import { normalizeAnswer, parseAnswerKey, validateQuestionShape } from './question-rules';

describe('validateQuestionShape', () => {
  const opt = (text: string, isCorrect = false, matchPair?: string) => ({
    text,
    isCorrect,
    matchPair,
  });

  it('single_choice: aynan bitta to‘g‘ri variant kerak', () => {
    expect(() =>
      validateQuestionShape(QuestionType.SINGLE_CHOICE, [opt('a', true), opt('b', false)], null),
    ).not.toThrow();
    expect(() =>
      validateQuestionShape(QuestionType.SINGLE_CHOICE, [opt('a', true), opt('b', true)], null),
    ).toThrow(BadRequestException);
    expect(() =>
      validateQuestionShape(QuestionType.SINGLE_CHOICE, [opt('a', false), opt('b', false)], null),
    ).toThrow(BadRequestException);
  });

  it('single_choice: kamida 2 variant', () => {
    expect(() => validateQuestionShape(QuestionType.SINGLE_CHOICE, [opt('a', true)], null)).toThrow(
      BadRequestException,
    );
  });

  it('multiple_choice: kamida bitta to‘g‘ri', () => {
    expect(() =>
      validateQuestionShape(QuestionType.MULTIPLE_CHOICE, [opt('a', true), opt('b', true)], null),
    ).not.toThrow();
    expect(() =>
      validateQuestionShape(QuestionType.MULTIPLE_CHOICE, [opt('a', false), opt('b', false)], null),
    ).toThrow(BadRequestException);
  });

  it('true_false: 2 variant va bitta to‘g‘ri', () => {
    expect(() =>
      validateQuestionShape(
        QuestionType.TRUE_FALSE,
        [opt('To‘g‘ri', true), opt('Noto‘g‘ri')],
        null,
      ),
    ).not.toThrow();
  });

  it('matching: har variantda juftlik bo‘lishi shart', () => {
    expect(() =>
      validateQuestionShape(
        QuestionType.MATCHING,
        [opt('a', false, 'A'), opt('b', false, 'B')],
        null,
      ),
    ).not.toThrow();
    expect(() =>
      validateQuestionShape(QuestionType.MATCHING, [opt('a', false, 'A'), opt('b')], null),
    ).toThrow(BadRequestException);
  });

  it('ordering: kamida 2 variant', () => {
    expect(() =>
      validateQuestionShape(QuestionType.ORDERING, [opt('1'), opt('2')], null),
    ).not.toThrow();
    expect(() => validateQuestionShape(QuestionType.ORDERING, [opt('1')], null)).toThrow(
      BadRequestException,
    );
  });

  it('short_answer: answer_key talab qilinadi', () => {
    expect(() => validateQuestionShape(QuestionType.SHORT_ANSWER, [], 'javob')).not.toThrow();
    expect(() => validateQuestionShape(QuestionType.SHORT_ANSWER, [], '')).toThrow(
      BadRequestException,
    );
    expect(() => validateQuestionShape(QuestionType.SHORT_ANSWER, [], null)).toThrow(
      BadRequestException,
    );
  });
});

describe('answer_key normalizatsiyasi (qaror §5)', () => {
  it('trim + lowercase + bo‘shliqlarni bittaga', () => {
    expect(normalizeAnswer('  Toshkent   Shahri ')).toBe('toshkent shahri');
  });

  it('parseAnswerKey vergul bilan ajratadi va normallashtiradi', () => {
    expect(parseAnswerKey('Toshkent,  TOSHKENT shahri , ,')).toEqual([
      'toshkent',
      'toshkent shahri',
    ]);
  });
});
