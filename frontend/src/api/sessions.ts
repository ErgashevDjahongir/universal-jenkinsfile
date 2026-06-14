import { tokenStorage } from '@/auth/tokenStorage';
import type { AuthUser } from './auth';
import { api } from './client';

export type SessionStatus =
  | 'in_progress'
  | 'completed'
  | 'expired'
  | 'cancelled'
  | 'terminated'
  | 'void';

export interface MonitorRow {
  id: string;
  assignmentId: string;
  userId: string;
  fullName?: string;
  status: SessionStatus;
  attemptNumber: number;
  isPreview: boolean;
  startedAt: string;
  deadlineAt: string;
  tabSwitches: number;
}

export interface SessionResultView {
  id: string;
  status: SessionStatus;
  finishedAt: string | null;
  score: string | null;
  maxScore: string | null;
  percent: string | null;
  passed: boolean | null;
  grade: string | null;
  certificateUid: string | null;
}

export interface SessionReviewQuestion {
  sessionQuestionId: string;
  orderIndex: number;
  type: string;
  text: string;
  points: string;
  isCorrect: boolean | null;
  awardedPoints: string | null;
  givenAnswer: unknown;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
    matchPair: string | null;
    orderIndex: number;
  }[];
}

export interface SessionReview {
  session: {
    id: string;
    assignmentId: string;
    userId: string;
    userFullName?: string | null;
    status: SessionStatus;
    attemptNumber: number;
    isPreview: boolean;
    startedAt: string;
    deadlineAt: string;
    finishedAt: string | null;
    tabSwitches: number;
    score: string | null;
    maxScore: string | null;
    percent: string | null;
    passed: boolean | null;
    grade: string | null;
  };
  questions: SessionReviewQuestion[];
}

export interface SessionFilter {
  status?: SessionStatus;
  assignmentId?: string;
}

export async function getSessions(filter?: SessionFilter): Promise<MonitorRow[]> {
  const { data } = await api.get<MonitorRow[]>('/sessions', { params: filter });
  return data;
}

export async function getSessionReview(id: string): Promise<SessionReview> {
  const { data } = await api.get<SessionReview>(`/sessions/${id}/review`);
  return data;
}

export async function cancelSession(id: string): Promise<SessionResultView> {
  const { data } = await api.post<SessionResultView>(`/sessions/${id}/cancel`);
  return data;
}

export async function terminateSession(id: string): Promise<SessionResultView> {
  const { data } = await api.post<SessionResultView>(`/sessions/${id}/terminate`);
  return data;
}

export async function allowRetry(id: string): Promise<{ code: string }> {
  const { data } = await api.post<{ code: string }>(`/sessions/${id}/allow-retry`);
  return data;
}

// ---- Topshiruvchi (examinee) tomoni ----

/** Savol turlari — backend `question_type` enum bilan mos. */
export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'true_false'
  | 'matching'
  | 'ordering'
  | 'short_answer';

/** Navigatsiya rejimi — backend `navigation_mode` enum bilan mos. */
export type NavigationMode = 'free' | 'forward_only';

/** Natija ko'rsatish rejimi — backend `result_visibility` enum bilan mos. */
export type ResultVisibility = 'immediately_full' | 'immediately_score' | 'hidden';

/** Topshiruvchi javobi (refresh'da tiklash uchun saqlangan ko'rinish). */
export interface ExamineeAnswer {
  selectedOptionIds?: string[] | null;
  matchPairs?: { optionId: string; value: string }[] | null;
  answerText?: string | null;
}

/** Topshiruvchiga ko'rsatiladigan bitta savol (to'g'ri javoblarsiz). */
export interface ExamineeQuestion {
  sessionQuestionId: string;
  orderIndex: number;
  type: QuestionType;
  text: string;
  points: string;
  options: { id: string; text: string }[];
  /** matching uchun o'ng ustun qiymatlari. */
  matchOptions?: string[];
  answer: ExamineeAnswer | null;
}

/** Topshiruvchiga sessiya holati + savollar. */
export interface ExamineeSession {
  id: string;
  status: SessionStatus;
  assignmentTitle: string;
  candidateName: string | null;
  startedAt: string;
  deadlineAt: string;
  serverNow: string;
  remainingSeconds: number;
  tabSwitches: number;
  maxTabSwitches: number;
  timeLimitMinutes: number;
  passingScorePercent: string;
  navigation: NavigationMode;
  resultVisibility: ResultVisibility;
  questions: ExamineeQuestion[];
}

/** Yakuniy natija (result_visibility'ga muvofiq). */
export interface SessionResult {
  id: string;
  status: SessionStatus;
  resultVisibility: ResultVisibility;
  finishedAt: string | null;
  score: string | null;
  maxScore: string | null;
  percent: string | null;
  passed: boolean | null;
  grade: string | null;
  certificateUid: string | null;
  correctCount?: number | null;
  totalCount?: number | null;
}

/** Kod orqali kirish so'rovi (anonim kod uchun F.I.Sh./telefon majburiy). */
export interface StartSessionPayload {
  code: string;
  lastName?: string;
  firstName?: string;
  middleName?: string;
  phone?: string;
}

interface StartSessionResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  session: { id: string };
}

/** Bitta savolga saqlanadigan javob (turiga qarab biri to'ldiriladi). */
export interface AnswerPayload {
  selectedOptionIds?: string[];
  matchPairs?: { optionId: string; value: string }[];
  answerText?: string;
}

/**
 * Kod orqali kirib sessiya ochadi; token juftligini saqlaydi va
 * autentifikatsiyalangan foydalanuvchi + sessiya id'sini qaytaradi.
 */
export async function startSession(
  payload: StartSessionPayload,
): Promise<{ user: AuthUser; sessionId: string }> {
  const { data } = await api.post<StartSessionResponse>('/sessions/start', payload);
  tokenStorage.setTokens(data.accessToken, data.refreshToken);
  return { user: data.user, sessionId: data.session.id };
}

/** Sessiya holati va savollarni oladi (refresh'da to'liq tiklash). */
export async function getExamineeSession(id: string): Promise<ExamineeSession> {
  const { data } = await api.get<ExamineeSession>(`/sessions/${id}`);
  return data;
}

/** Bitta savol javobini darhol serverda saqlaydi (avtosave). */
export async function submitAnswer(
  sessionId: string,
  sessionQuestionId: string,
  payload: AnswerPayload,
): Promise<void> {
  await api.post(`/sessions/${sessionId}/answers/${sessionQuestionId}`, payload);
}

/** Tab/oyna almashtirishni qayd etadi (limitdan oshsa avtoyakun). */
export async function recordTabSwitch(
  sessionId: string,
): Promise<{ tabSwitches: number; terminated: boolean }> {
  const { data } = await api.post<{ tabSwitches: number; terminated: boolean }>(
    `/sessions/${sessionId}/tab-switch`,
  );
  return data;
}

/** Sessiyani yakunlaydi (idempotent — yakunlangan bo'lsa mavjud natijani qaytaradi). */
export async function finishSession(sessionId: string): Promise<SessionResult> {
  const { data } = await api.post<SessionResult>(`/sessions/${sessionId}/finish`);
  return data;
}
