import { DifficultyLevel } from '../../common/enums/difficulty-level.enum';
import { SelectionRuleInput, selectQuestions } from './question-selection';

/** Deterministik RNG: berilgan qiymatlar ketma-ketligini qaytaradi, tugasa 0. */
function seededRandom(values: number[]): () => number {
  let i = 0;
  return () => (i < values.length ? values[i++] : 0);
}

/** Qator id'lardan pool yasash uchun qisqartma. */
function rule(
  partial: Partial<SelectionRuleInput> & { questionCount: number; candidateIds: string[] },
): SelectionRuleInput {
  return {
    subjectId: '1',
    categoryId: null,
    difficulty: null,
    ...partial,
  };
}

describe('selectQuestions', () => {
  it('yetarli savol yo‘q: kamomad shortages‘da aniq ko‘rsatiladi', () => {
    const result = selectQuestions({
      fixedIds: [],
      rules: [rule({ categoryId: '10', questionCount: 5, candidateIds: ['a', 'b', 'c'] })],
    });

    expect(result.questionIds).toHaveLength(3);
    expect(result.shortages).toHaveLength(1);
    expect(result.shortages[0]).toMatchObject({
      ruleIndex: 0,
      categoryId: '10',
      requested: 5,
      available: 3,
      missing: 2,
    });
  });

  it('roppa-rosa yetadi (chegara): kamomad yo‘q, hammasi tanlanadi', () => {
    const result = selectQuestions({
      fixedIds: [],
      rules: [rule({ questionCount: 3, candidateIds: ['a', 'b', 'c'] })],
    });

    expect(result.shortages).toHaveLength(0);
    expect(new Set(result.questionIds)).toEqual(new Set(['a', 'b', 'c']));
  });

  it('kategoriya/qiyinlik taqsimoti: har qoidadan kerakli son olinadi', () => {
    const result = selectQuestions({
      fixedIds: [],
      rules: [
        rule({
          categoryId: '10',
          difficulty: DifficultyLevel.EASY,
          questionCount: 2,
          candidateIds: ['e1', 'e2', 'e3', 'e4'],
        }),
        rule({
          categoryId: '20',
          difficulty: DifficultyLevel.HARD,
          questionCount: 1,
          candidateIds: ['h1', 'h2'],
        }),
      ],
    });

    expect(result.shortages).toHaveLength(0);
    expect(result.questionIds).toHaveLength(3);
    const easyPicked = result.questionIds.filter((id) => id.startsWith('e'));
    const hardPicked = result.questionIds.filter((id) => id.startsWith('h'));
    expect(easyPicked).toHaveLength(2);
    expect(hardPicked).toHaveLength(1);
  });

  it('exclude yumshoq to‘ldirish: avval istisnodan tashqaridagilar olinadi', () => {
    // RNG har doim 0 → shuffle tartibni saqlaydi, natija deterministik.
    const result = selectQuestions({
      fixedIds: [],
      rules: [rule({ questionCount: 3, candidateIds: ['old1', 'new1', 'old2', 'new2'] })],
      excludeIds: ['old1', 'old2'],
      random: seededRandom([]),
    });

    expect(result.shortages).toHaveLength(0);
    // new1, new2 (afzal) + bittasi zaxiradan (old...) — takror urinish savoli
    // faqat afzallar yetmaganda qo‘shiladi.
    expect(result.questionIds).toContain('new1');
    expect(result.questionIds).toContain('new2');
    const fromExcluded = result.questionIds.filter((id) => id.startsWith('old'));
    expect(fromExcluded).toHaveLength(1);
  });

  it('exclude: afzallar yetarli bo‘lsa istisnodagilar umuman olinmaydi', () => {
    const result = selectQuestions({
      fixedIds: [],
      rules: [rule({ questionCount: 2, candidateIds: ['old1', 'new1', 'new2'] })],
      excludeIds: ['old1'],
      random: seededRandom([]),
    });

    expect(result.questionIds).not.toContain('old1');
    expect(new Set(result.questionIds)).toEqual(new Set(['new1', 'new2']));
  });

  it('fixed + auto aralashganda dublikat bo‘lmaydi', () => {
    // q1 ham fixed, ham qoidaning candidate poolida — natijada bir marta.
    const result = selectQuestions({
      fixedIds: ['q1'],
      rules: [rule({ questionCount: 2, candidateIds: ['q1', 'q2', 'q3'] })],
      random: seededRandom([]),
    });

    expect(result.questionIds[0]).toBe('q1');
    expect(new Set(result.questionIds).size).toBe(result.questionIds.length);
    // q1 fixed sifatida band, qoida qolgan ikkitadan oladi.
    expect(new Set(result.questionIds)).toEqual(new Set(['q1', 'q2', 'q3']));
    expect(result.shortages).toHaveLength(0);
  });

  it('bir-birini qoplaydigan qoidalar: pool ulashiladi, kamomad to‘g‘ri hisoblanadi', () => {
    // Ikkala qoida ham bir xil 3 ta savolni nishonlaydi; jami 4 ta so‘ralgan.
    const shared = ['s1', 's2', 's3'];
    const result = selectQuestions({
      fixedIds: [],
      rules: [
        rule({ questionCount: 2, candidateIds: [...shared] }),
        rule({ questionCount: 2, candidateIds: [...shared] }),
      ],
      random: seededRandom([]),
    });

    expect(new Set(result.questionIds).size).toBe(result.questionIds.length);
    expect(result.questionIds).toHaveLength(3);
    // 1-qoida 2 ta oldi, 2-qoidaga faqat 1 ta qoldi → kamomad 1.
    expect(result.shortages).toHaveLength(1);
    expect(result.shortages[0]).toMatchObject({ ruleIndex: 1, missing: 1 });
  });
});
