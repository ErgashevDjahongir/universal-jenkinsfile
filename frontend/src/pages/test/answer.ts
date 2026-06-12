import type { AnswerPayload, ExamineeQuestion } from '@/api/sessions';

/** Savolga maʼnoli javob berilganmi (navigatsiya indikatsiyasi uchun). */
export function isAnswered(q: ExamineeQuestion, a: AnswerPayload | undefined): boolean {
  if (!a) {
    return false;
  }
  if (q.type === 'short_answer') {
    return !!a.answerText && a.answerText.trim() !== '';
  }
  if (q.type === 'matching') {
    return (a.matchPairs ?? []).some((p) => p.value.trim() !== '');
  }
  return (a.selectedOptionIds ?? []).length > 0;
}

/** Saqlangan javobdan (refresh) tahrirlash holatini quradi. */
export function answerFromStored(q: ExamineeQuestion): AnswerPayload {
  const stored = q.answer;
  if (!stored) {
    return {};
  }
  if (q.type === 'short_answer') {
    return { answerText: stored.answerText ?? '' };
  }
  if (q.type === 'matching') {
    return { matchPairs: stored.matchPairs ?? [] };
  }
  return { selectedOptionIds: stored.selectedOptionIds ?? [] };
}
