/**
 * Sessiyaga savollarni MUHRLASH (sof, DB'siz mantiq — unit test qilinadi).
 *
 * Sessiya ochilishida har topshiruvchiga savollar va variantlar tartibi alohida
 * aralashtiriladi va snapshot qilinadi: keyin refresh/qayta yuklashda o'zgarmaydi.
 * Ball ham shu yerda muhrlanadi (shablon override yoki bankdagi ball).
 */

/** Bitta savol uchun muhrlash kirishi (servis DB'dan yig'adi). */
export interface SealQuestionInput {
  questionId: string;
  /** Snapshot ball: shablon `points_override` yoki savolning bankdagi bali. */
  points: string;
  /** Variant id-lari — bankdagi asl tartibda. */
  optionIds: string[];
}

export interface SealParams {
  /** Tanlangan savollar — shablon tanlovi tartibida (fixed + qoidalar). */
  questions: SealQuestionInput[];
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  /** Injektsiya qilinadigan RNG (default Math.random) — deterministik test uchun. */
  random?: () => number;
}

/** Muhrlangan bitta savol qatori (session_questions ga yoziladi). */
export interface SealedQuestion {
  questionId: string;
  orderIndex: number;
  points: string;
  optionsOrder: string[];
}

/**
 * Fisher–Yates aralashtirish (nusxa ustida; kirish massivi o'zgartirilmaydi).
 */
function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Savollar va variantlarni shablon sozlamalari bo'yicha muhrlaydi.
 * - `shuffleQuestions` — savollar tartibini aralashtiradi (aks holda tanlov tartibi).
 * - `shuffleOptions` — har savol variantlari tartibini aralashtiradi (aks holda asl tartib).
 * `orderIndex` 0 dan boshlab ketma-ket beriladi (yakuniy ko'rsatish tartibi).
 */
export function sealSession(params: SealParams): SealedQuestion[] {
  const random = params.random ?? Math.random;

  const ordered = params.shuffleQuestions
    ? shuffle(params.questions, random)
    : params.questions.slice();

  return ordered.map((q, index) => ({
    questionId: q.questionId,
    orderIndex: index,
    points: q.points,
    optionsOrder: params.shuffleOptions ? shuffle(q.optionIds, random) : q.optionIds.slice(),
  }));
}
