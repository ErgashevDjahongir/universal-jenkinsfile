import { SealQuestionInput, sealSession } from './session-sealing';

/** Deterministik RNG: berilgan qiymatlar ketma-ketligini qaytaradi, tugasa 0. */
function seededRandom(values: number[]): () => number {
  let i = 0;
  return () => (i < values.length ? values[i++] : 0);
}

function q(id: string, points: string, optionIds: string[]): SealQuestionInput {
  return { questionId: id, points, optionIds };
}

describe('sealSession', () => {
  const questions = [
    q('10', '2.00', ['1', '2', '3']),
    q('11', '1.00', ['4', '5']),
    q('12', '3.00', []), // short_answer — variantsiz
  ];

  it('aralashtirishsiz: tanlov tartibi va asl variant tartibi saqlanadi', () => {
    const sealed = sealSession({
      questions,
      shuffleQuestions: false,
      shuffleOptions: false,
    });

    expect(sealed.map((s) => s.questionId)).toEqual(['10', '11', '12']);
    expect(sealed.map((s) => s.orderIndex)).toEqual([0, 1, 2]);
    expect(sealed.map((s) => s.points)).toEqual(['2.00', '1.00', '3.00']);
    expect(sealed[0].optionsOrder).toEqual(['1', '2', '3']);
    expect(sealed[2].optionsOrder).toEqual([]); // variantsiz savol
  });

  it('savollar aralashtirilganda ball savol bilan birga ko‘chadi', () => {
    const sealed = sealSession({
      questions,
      shuffleQuestions: true,
      shuffleOptions: false,
      random: seededRandom([0, 0, 0]),
    });

    // orderIndex har doim 0..n ketma-ket; har savol o‘z balini saqlaydi.
    expect(sealed.map((s) => s.orderIndex)).toEqual([0, 1, 2]);
    expect(new Set(sealed.map((s) => s.questionId))).toEqual(new Set(['10', '11', '12']));
    for (const s of sealed) {
      const original = questions.find((x) => x.questionId === s.questionId)!;
      expect(s.points).toBe(original.points);
    }
  });

  it('variantlar aralashtirilganda barcha id saqlanadi (yo‘qolmaydi/qo‘shilmaydi)', () => {
    const sealed = sealSession({
      questions,
      shuffleQuestions: false,
      shuffleOptions: true,
      random: seededRandom([0.9, 0.1, 0.5, 0.5]),
    });

    expect(new Set(sealed[0].optionsOrder)).toEqual(new Set(['1', '2', '3']));
    expect(sealed[0].optionsOrder).toHaveLength(3);
  });

  it('kirish massivlarini o‘zgartirmaydi (sof funksiya)', () => {
    const input = [q('10', '2.00', ['1', '2', '3'])];
    const snapshot = JSON.stringify(input);
    sealSession({ questions: input, shuffleQuestions: true, shuffleOptions: true });
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
