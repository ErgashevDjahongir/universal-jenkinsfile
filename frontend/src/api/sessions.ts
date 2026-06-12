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
