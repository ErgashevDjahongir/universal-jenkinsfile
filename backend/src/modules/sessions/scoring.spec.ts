import { GradeValue } from '../../common/enums/grade-value.enum';
import { QuestionType } from '../../common/enums/question-type.enum';
import {
  computeSessionScore,
  gradeQuestion,
  GradeOption,
  normalizeAnswer,
  resolveGrade,
} from './scoring';

function opt(id: string, isCorrect: boolean, extra: Partial<GradeOption> = {}): GradeOption {
  return { id, isCorrect, orderIndex: 0, matchPair: null, ...extra };
}

const base = {
  points: 4,
  answerKey: null as string | null,
  partialScoring: false,
  negativeMarking: false,
  negativePoints: 0,
};

describe('gradeQuestion — single_choice / true_false', () => {
  const options = [opt('1', true), opt('2', false), opt('3', false)];

  it('to‘g‘ri tanlov → to‘liq ball', () => {
    const r = gradeQuestion(
      { ...base, type: QuestionType.SINGLE_CHOICE, options },
      { selectedOptionIds: ['1'] },
    );
    expect(r).toEqual({ isCorrect: true, awardedPoints: 4 });
  });

  it('noto‘g‘ri tanlov + jarima rejimi → −jarima (to‘liq noto‘g‘ri)', () => {
    const r = gradeQuestion(
      {
        ...base,
        type: QuestionType.SINGLE_CHOICE,
        options,
        negativeMarking: true,
        negativePoints: 1.5,
      },
      { selectedOptionIds: ['2'] },
    );
    expect(r).toEqual({ isCorrect: false, awardedPoints: -1.5 });
  });
});

describe('gradeQuestion — multiple_choice (qisman + jarima §7)', () => {
  // 2 ta to‘g‘ri (1,2), 2 ta noto‘g‘ri (3,4); points=4.
  const options = [opt('1', true), opt('2', true), opt('3', false), opt('4', false)];
  const q = { ...base, type: QuestionType.MULTIPLE_CHOICE, options, points: 4 };

  it('to‘liq to‘g‘ri → to‘liq ball', () => {
    expect(gradeQuestion(q, { selectedOptionIds: ['1', '2'] })).toEqual({
      isCorrect: true,
      awardedPoints: 4,
    });
  });

  it('qisman (1 to‘g‘ri, 0 noto‘g‘ri) → points*(1/2)=2, jarimasiz', () => {
    const r = gradeQuestion(
      { ...q, partialScoring: true, negativeMarking: true, negativePoints: 5 },
      { selectedOptionIds: ['1'] },
    );
    expect(r).toEqual({ isCorrect: false, awardedPoints: 2 });
  });

  it('qisman (1 to‘g‘ri, 1 noto‘g‘ri) → (1−1)/2=0, jarima YO‘Q (to‘liq noto‘g‘ri emas)', () => {
    const r = gradeQuestion(
      { ...q, partialScoring: true, negativeMarking: true, negativePoints: 5 },
      { selectedOptionIds: ['1', '3'] },
    );
    expect(r).toEqual({ isCorrect: false, awardedPoints: 0 });
  });

  it('to‘liq noto‘g‘ri (faqat noto‘g‘rilar) → jarima qo‘llanadi', () => {
    const r = gradeQuestion(
      { ...q, partialScoring: true, negativeMarking: true, negativePoints: 1.5 },
      { selectedOptionIds: ['3', '4'] },
    );
    expect(r).toEqual({ isCorrect: false, awardedPoints: -1.5 });
  });

  it('partialScoring o‘chiq + to‘liq mos emas → 0 (jarimasiz, chunki to‘g‘ri ham bor)', () => {
    const r = gradeQuestion(q, { selectedOptionIds: ['1'] });
    expect(r).toEqual({ isCorrect: false, awardedPoints: 0 });
  });
});

describe('gradeQuestion — ordering', () => {
  const options = [
    opt('a', true, { orderIndex: 0 }),
    opt('b', true, { orderIndex: 1 }),
    opt('c', true, { orderIndex: 2 }),
  ];
  const q = { ...base, type: QuestionType.ORDERING, options, points: 3 };

  it('to‘g‘ri ketma-ketlik → to‘liq ball', () => {
    expect(gradeQuestion(q, { selectedOptionIds: ['a', 'b', 'c'] })).toEqual({
      isCorrect: true,
      awardedPoints: 3,
    });
  });

  it('noto‘g‘ri ketma-ketlik → 0 (jarimasiz, negativeMarking o‘chiq)', () => {
    expect(gradeQuestion(q, { selectedOptionIds: ['a', 'c', 'b'] })).toEqual({
      isCorrect: false,
      awardedPoints: 0,
    });
  });
});

describe('gradeQuestion — matching (qisman)', () => {
  const options = [
    opt('1', true, { matchPair: 'Toshkent' }),
    opt('2', true, { matchPair: 'Samarqand' }),
  ];
  const q = { ...base, type: QuestionType.MATCHING, options, points: 4, partialScoring: true };

  it('hammasi to‘g‘ri → to‘liq ball', () => {
    const r = gradeQuestion(q, {
      matchPairs: [
        { optionId: '1', value: 'Toshkent' },
        { optionId: '2', value: 'Samarqand' },
      ],
    });
    expect(r).toEqual({ isCorrect: true, awardedPoints: 4 });
  });

  it('yarmi to‘g‘ri → points*(1/2)=2', () => {
    const r = gradeQuestion(q, {
      matchPairs: [
        { optionId: '1', value: 'Toshkent' },
        { optionId: '2', value: 'Buxoro' },
      ],
    });
    expect(r).toEqual({ isCorrect: false, awardedPoints: 2 });
  });
});

describe('gradeQuestion — short_answer (§5)', () => {
  const q = {
    ...base,
    type: QuestionType.SHORT_ANSWER,
    options: [],
    answerKey: 'Toshkent, Tashkent',
    points: 2,
  };

  it('normalizatsiya bilan mos (bo‘shliq/registr) → to‘liq ball', () => {
    expect(gradeQuestion(q, { answerText: '  TOSHKENT ' })).toEqual({
      isCorrect: true,
      awardedPoints: 2,
    });
  });

  it('ko‘p bo‘shliqli variant ham moslanadi', () => {
    expect(normalizeAnswer('  Toshkent   shahri ')).toBe('toshkent shahri');
  });

  it('mos kelmasa → 0', () => {
    expect(gradeQuestion(q, { answerText: 'Namangan' })).toEqual({
      isCorrect: false,
      awardedPoints: 0,
    });
  });
});

describe('gradeQuestion — javob berilmagan savol jarimalanmaydi (§7)', () => {
  const neg = { negativeMarking: true, negativePoints: 2 };

  it('single_choice bo‘sh → 0 (jarimasiz)', () => {
    const options = [opt('1', true), opt('2', false)];
    expect(
      gradeQuestion({ ...base, ...neg, type: QuestionType.SINGLE_CHOICE, options }, {}),
    ).toEqual({ isCorrect: false, awardedPoints: 0 });
  });

  it('multiple_choice bo‘sh → 0 (jarimasiz)', () => {
    const options = [opt('1', true), opt('2', true)];
    expect(
      gradeQuestion(
        { ...base, ...neg, partialScoring: true, type: QuestionType.MULTIPLE_CHOICE, options },
        { selectedOptionIds: [] },
      ),
    ).toEqual({ isCorrect: false, awardedPoints: 0 });
  });

  it('ordering bo‘sh → 0 (jarimasiz)', () => {
    const options = [opt('a', true, { orderIndex: 0 }), opt('b', true, { orderIndex: 1 })];
    expect(gradeQuestion({ ...base, ...neg, type: QuestionType.ORDERING, options }, {})).toEqual({
      isCorrect: false,
      awardedPoints: 0,
    });
  });

  it('matching bo‘sh → 0 (jarimasiz)', () => {
    const options = [opt('1', true, { matchPair: 'X' })];
    expect(
      gradeQuestion({ ...base, ...neg, type: QuestionType.MATCHING, options }, { matchPairs: [] }),
    ).toEqual({ isCorrect: false, awardedPoints: 0 });
  });

  it('short_answer bo‘sh → 0 (jarimasiz)', () => {
    expect(
      gradeQuestion(
        { ...base, ...neg, type: QuestionType.SHORT_ANSWER, options: [], answerKey: 'x' },
        { answerText: '  ' },
      ),
    ).toEqual({ isCorrect: false, awardedPoints: 0 });
  });
});

describe('computeSessionScore — floor 0 va foiz', () => {
  it('jami manfiy → 0 ga floor qilinadi', () => {
    const score = computeSessionScore(
      [
        { points: 2, awardedPoints: -1.5 },
        { points: 2, awardedPoints: -1.5 },
      ],
      60,
      [],
    );
    expect(score.score).toBe(0);
    expect(score.maxScore).toBe(4);
    expect(score.percent).toBe(0);
    expect(score.passed).toBe(false);
  });

  it('foiz va o‘tish bo‘sag‘asi', () => {
    const score = computeSessionScore(
      [
        { points: 5, awardedPoints: 5 },
        { points: 5, awardedPoints: 1 },
      ],
      60,
      [],
    );
    expect(score.score).toBe(6);
    expect(score.percent).toBe(60);
    expect(score.passed).toBe(true);
  });
});

describe('resolveGrade — shkala', () => {
  const scale = [
    { grade: GradeValue.EXCELLENT, minPercent: 85 },
    { grade: GradeValue.GOOD, minPercent: 70 },
    { grade: GradeValue.SATISFACTORY, minPercent: 60 },
  ];

  it('foizga mos eng yuqori bahoni tanlaydi', () => {
    expect(resolveGrade(90, scale)).toBe(GradeValue.EXCELLENT);
    expect(resolveGrade(72, scale)).toBe(GradeValue.GOOD);
    expect(resolveGrade(60, scale)).toBe(GradeValue.SATISFACTORY);
  });

  it('hech bir bo‘sag‘aga yetmasa → null', () => {
    expect(resolveGrade(40, scale)).toBeNull();
  });
});
