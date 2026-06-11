import { DifficultyLevel } from '../../common/enums/difficulty-level.enum';

/**
 * Bitta avtomatik tanlash qoidasi uchun kirish ma'lumoti.
 * `candidateIds` — qoidaning filtrlariga (fan + kategoriya + qiyinlik, faqat
 * status=active) mos KELADIGAN barcha savol id-lari. DB so'rovi servisda
 * bajariladi; bu yerdagi mantiq sof (DB'siz) bo'lib, unit test qilinadi.
 */
export interface SelectionRuleInput {
  subjectId: string;
  categoryId: string | null;
  difficulty: DifficultyLevel | null;
  questionCount: number;
  candidateIds: string[];
}

/** Tanlash parametrlari. */
export interface SelectQuestionsParams {
  /** Qo'lda tanlangan (majburiy) savollar — har doim natijaga kiradi. */
  fixedIds: string[];
  /** Avtomatik tanlash qoidalari (tartibi muhim: oldingi qoida poolni «yeydi»). */
  rules: SelectionRuleInput[];
  /**
   * Yumshoq istisno (qaror §8): imkon qadar chiqarib tashlanadigan savollar
   * (masalan, avvalgi urinish savollari). Yetishmasa, takror savollar bilan
   * to'ldiriladi — xato qaytarilmaydi.
   */
  excludeIds?: string[];
  /** Test uchun injektsiya qilinadigan RNG (default Math.random). */
  random?: () => number;
}

/** Qoida bo'yicha savol yetishmasligi haqida hisobot bandi. */
export interface SelectionShortage {
  ruleIndex: number;
  subjectId: string;
  categoryId: string | null;
  difficulty: DifficultyLevel | null;
  requested: number;
  available: number;
  missing: number;
}

export interface SelectQuestionsResult {
  /** Tanlangan savol id-lari: avval fixed (berilgan tartibda), keyin qoidalar. */
  questionIds: string[];
  /** Bo'sh bo'lmasa — bankda yetarli savol yo'q (qaysi qoidada nechta). */
  shortages: SelectionShortage[];
}

/**
 * Fisher–Yates aralashtirish (nusxa ustida; kirish massivi o'zgartirilmaydi).
 * Injektsiya qilingan RNG bilan deterministik test qilinadi.
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
 * Shablon bo'yicha savollarni tanlaydi: fixed + avtomatik qoidalar.
 *
 * Kafolatlar:
 * - Bitta natijada savol TAKRORLANMAYDI (fixed va barcha qoidalar bo'ylab dedup).
 * - Tanlash tasodifiy (RNG bilan aralashtirib, kerakli sonini oladi).
 * - `excludeIds` yumshoq: avval istisnodan tashqari savollar olinadi, yetmasa
 *   istisnodagilar bilan to'ldiriladi (xato emas).
 * - Bank yetishmasa, mavjudini oladi va `shortages`'ga aniq kamomadni yozadi;
 *   chaqiruvchi (servis) shu asosda faollashtirishni bloklaydi yoki davom etadi.
 */
export function selectQuestions(params: SelectQuestionsParams): SelectQuestionsResult {
  const random = params.random ?? Math.random;
  const exclude = new Set(params.excludeIds ?? []);

  // Fixed savollar har doim kiradi va dedup uchun «band» hisoblanadi.
  const chosen: string[] = [];
  const used = new Set<string>();
  for (const id of params.fixedIds) {
    if (!used.has(id)) {
      used.add(id);
      chosen.push(id);
    }
  }

  const shortages: SelectionShortage[] = [];

  params.rules.forEach((rule, ruleIndex) => {
    // Avval boshqa joyda (fixed yoki oldingi qoidalarda) tanlangan savollarni
    // pooldan chiqarib tashlaymiz — bu dublikatlarning oldini oladi.
    const pool = rule.candidateIds.filter((id) => !used.has(id));

    // Yumshoq istisno: afzal (istisnoda emas) va zaxira (istisnoda) qismlarga
    // ajratamiz; har birini alohida aralashtirib, afzaldan boshlab olamiz.
    const preferred = shuffle(
      pool.filter((id) => !exclude.has(id)),
      random,
    );
    const fallback = shuffle(
      pool.filter((id) => exclude.has(id)),
      random,
    );

    const ordered = [...preferred, ...fallback];
    const available = ordered.length;
    const take = Math.min(rule.questionCount, available);

    for (let i = 0; i < take; i += 1) {
      used.add(ordered[i]);
      chosen.push(ordered[i]);
    }

    if (available < rule.questionCount) {
      shortages.push({
        ruleIndex,
        subjectId: rule.subjectId,
        categoryId: rule.categoryId,
        difficulty: rule.difficulty,
        requested: rule.questionCount,
        available,
        missing: rule.questionCount - available,
      });
    }
  });

  return { questionIds: chosen, shortages };
}
