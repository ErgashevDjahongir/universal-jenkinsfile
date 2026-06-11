import { GradeValue } from '../../common/enums/grade-value.enum';
import { QuestionType } from '../../common/enums/question-type.enum';

/**
 * Baholash — sof (DB'siz) mantiq; unit test qilinadi.
 *
 * Qoidalar (qaror §7):
 * - `negativePoints` faqat savol TO'LIQ noto'g'ri bo'lganda (bitta ham to'g'ri
 *   tanlanmagan) qo'llanadi; qisman ball olgan savolga jarima yo'q.
 * - Savol darajasida `awardedPoints` manfiy bo'lishi mumkin (−negativePoints).
 * - Sessiya JAMI bali 0 dan pastga tushmaydi (aggregat darajasida floor).
 * short_answer (qaror §5): answerKey — vergul bilan ajratilgan qabul variantlari;
 * normalizatsiya (trim + lowercase + ketma-ket bo'shliqlarni bittaga) bilan
 * bittasiga to'liq mos kelsa — to'liq ball, aks holda 0 (qisman yo'q).
 */

/** Bitta variant ta'rifi (server tomonida; mijozga uzatilmaydi). */
export interface GradeOption {
  id: string;
  isCorrect: boolean;
  orderIndex: number;
  matchPair: string | null;
}

/** Baholanadigan savol (muhrlangan ball bilan) + shablon ball sozlamalari. */
export interface GradeQuestionInput {
  type: QuestionType;
  /** Muhrlangan ball (session_questions.points). */
  points: number;
  options: GradeOption[];
  answerKey: string | null;
  partialScoring: boolean;
  negativeMarking: boolean;
  negativePoints: number;
}

/** Topshiruvchi javobi (session_answers'dan). */
export interface ExamineeAnswer {
  /** single/multiple/true_false: tanlangan; ordering: tanlangan tartib. */
  selectedOptionIds?: string[] | null;
  /** matching: chap variant → tanlangan o'ng qiymat. */
  matchPairs?: { optionId: string; value: string }[] | null;
  /** short_answer matni. */
  answerText?: string | null;
}

export interface GradeResult {
  isCorrect: boolean;
  awardedPoints: number;
}

/** 2 kasrgacha yaxlitlash (numeric(5,2) bilan mos; suzuvchi xatoni oldini oladi). */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** short_answer normalizatsiyasi (qaror §5). */
export function normalizeAnswer(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** TO'LIQ noto'g'ri javob uchun jarima (yoki 0). */
function penalty(input: GradeQuestionInput): number {
  return input.negativeMarking ? -round2(input.negativePoints) : 0;
}

function gradeChoice(input: GradeQuestionInput, answer: ExamineeAnswer): GradeResult {
  const correctIds = new Set(input.options.filter((o) => o.isCorrect).map((o) => o.id));
  const validIds = new Set(input.options.map((o) => o.id));
  const selected = new Set((answer.selectedOptionIds ?? []).filter((id) => validIds.has(id)));

  const total = correctIds.size;
  let chosenCorrect = 0;
  let chosenWrong = 0;
  for (const id of selected) {
    if (correctIds.has(id)) chosenCorrect += 1;
    else chosenWrong += 1;
  }

  const exact = total > 0 && chosenCorrect === total && chosenWrong === 0;
  if (exact) {
    return { isCorrect: true, awardedPoints: round2(input.points) };
  }

  // Qisman ball faqat multiple_choice'da (single/true_false — hammasi yoki hech narsa).
  if (input.partialScoring && input.type === QuestionType.MULTIPLE_CHOICE && total > 0) {
    const fraction = (chosenCorrect - chosenWrong) / total;
    if (fraction > 0) {
      return { isCorrect: false, awardedPoints: round2(input.points * fraction) };
    }
  }

  // Jarima faqat javob BERILGAN va to'liq noto'g'ri bo'lsa (qaror §7); javob
  // berilmagan (bo'sh) savol jarimalanmaydi.
  const answered = selected.size > 0;
  const fullyWrong = chosenCorrect === 0;
  return { isCorrect: false, awardedPoints: answered && fullyWrong ? penalty(input) : 0 };
}

function gradeOrdering(input: GradeQuestionInput, answer: ExamineeAnswer): GradeResult {
  const correctOrder = [...input.options]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((o) => o.id);
  const chosen = answer.selectedOptionIds ?? [];

  const correct =
    chosen.length === correctOrder.length && chosen.every((id, i) => id === correctOrder[i]);
  if (correct) {
    return { isCorrect: true, awardedPoints: round2(input.points) };
  }
  // Ketma-ketlik qisman baholanmaydi (MVP); noto'g'ri bo'lsa to'liq noto'g'ri.
  // Javob berilmagan (bo'sh) bo'lsa jarima qo'llanmaydi.
  const answered = chosen.length > 0;
  return { isCorrect: false, awardedPoints: answered ? penalty(input) : 0 };
}

function gradeMatching(input: GradeQuestionInput, answer: ExamineeAnswer): GradeResult {
  const total = input.options.length;
  if (total === 0) {
    return { isCorrect: false, awardedPoints: 0 };
  }
  const provided = new Map((answer.matchPairs ?? []).map((p) => [p.optionId, p.value]));
  let chosenCorrect = 0;
  for (const option of input.options) {
    if (provided.get(option.id) === option.matchPair) {
      chosenCorrect += 1;
    }
  }

  if (chosenCorrect === total) {
    return { isCorrect: true, awardedPoints: round2(input.points) };
  }
  if (input.partialScoring && chosenCorrect > 0) {
    return { isCorrect: false, awardedPoints: round2(input.points * (chosenCorrect / total)) };
  }
  // Jarima faqat javob berilgan va to'liq noto'g'ri bo'lsa.
  const answered = provided.size > 0;
  const fullyWrong = chosenCorrect === 0;
  return { isCorrect: false, awardedPoints: answered && fullyWrong ? penalty(input) : 0 };
}

function gradeShortAnswer(input: GradeQuestionInput, answer: ExamineeAnswer): GradeResult {
  const text = answer.answerText ?? '';
  // Javob berilmagan yoki kalit yo'q (baholab bo'lmaydi) → 0, jarimasiz.
  if (!input.answerKey || text.trim() === '') {
    return { isCorrect: false, awardedPoints: 0 };
  }
  const accepted = input.answerKey
    .split(',')
    .map((v) => normalizeAnswer(v))
    .filter((v) => v.length > 0);
  const given = normalizeAnswer(text);
  const correct = accepted.includes(given);
  if (correct) {
    return { isCorrect: true, awardedPoints: round2(input.points) };
  }
  return { isCorrect: false, awardedPoints: penalty(input) };
}

/** Bitta savolni baholaydi (turiga qarab). */
export function gradeQuestion(input: GradeQuestionInput, answer: ExamineeAnswer): GradeResult {
  switch (input.type) {
    case QuestionType.SINGLE_CHOICE:
    case QuestionType.TRUE_FALSE:
    case QuestionType.MULTIPLE_CHOICE:
      return gradeChoice(input, answer);
    case QuestionType.ORDERING:
      return gradeOrdering(input, answer);
    case QuestionType.MATCHING:
      return gradeMatching(input, answer);
    case QuestionType.SHORT_ANSWER:
      return gradeShortAnswer(input, answer);
    default:
      return { isCorrect: false, awardedPoints: 0 };
  }
}

/** Baholangan savol natijasi (aggregatsiya uchun). */
export interface ScoredQuestion {
  points: number;
  awardedPoints: number;
}

/** Baho shkalasi bandi. */
export interface GradeBand {
  grade: GradeValue;
  minPercent: number;
}

export interface SessionScore {
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  grade: GradeValue | null;
}

/**
 * Sessiya yakuniy balini hisoblaydi: jami ball (floor 0), foiz, o'tdi/o'tmadi, baho.
 */
export function computeSessionScore(
  scored: ScoredQuestion[],
  passingScorePercent: number,
  gradeScale: GradeBand[],
): SessionScore {
  const rawScore = scored.reduce((sum, q) => sum + q.awardedPoints, 0);
  const score = round2(Math.max(0, rawScore));
  const maxScore = round2(scored.reduce((sum, q) => sum + q.points, 0));
  const percent = maxScore > 0 ? round2((score / maxScore) * 100) : 0;
  const passed = percent >= passingScorePercent;
  return { score, maxScore, percent, passed, grade: resolveGrade(percent, gradeScale) };
}

/** Foizga mos eng yuqori bahoni (minPercent <= percent) tanlaydi. */
export function resolveGrade(percent: number, gradeScale: GradeBand[]): GradeValue | null {
  let best: GradeBand | null = null;
  for (const band of gradeScale) {
    if (percent >= band.minPercent && (best === null || band.minPercent > best.minPercent)) {
      best = band;
    }
  }
  return best ? best.grade : null;
}
