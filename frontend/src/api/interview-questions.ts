import { api } from './client';

export interface InterviewQuestion {
  id: string;
  subjectId: string;
  questionText: string;
  expectedAnswer: string;
  rationale: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewQuestionFilter {
  subjectId?: string;
  search?: string;
}

export interface CreateInterviewQuestionPayload {
  subjectId: string;
  questionText: string;
  expectedAnswer: string;
  rationale?: string;
}

export interface UpdateInterviewQuestionPayload {
  subjectId?: string;
  questionText?: string;
  expectedAnswer?: string;
  rationale?: string;
}

export function getInterviewQuestions(
  filter?: InterviewQuestionFilter,
): Promise<InterviewQuestion[]> {
  return api
    .get<InterviewQuestion[]>('/interview-questions', { params: filter })
    .then((r) => r.data);
}

export function getInterviewQuestion(id: string): Promise<InterviewQuestion> {
  return api.get<InterviewQuestion>(`/interview-questions/${id}`).then((r) => r.data);
}

export function createInterviewQuestion(
  payload: CreateInterviewQuestionPayload,
): Promise<InterviewQuestion> {
  return api.post<InterviewQuestion>('/interview-questions', payload).then((r) => r.data);
}

export function updateInterviewQuestion(
  id: string,
  payload: UpdateInterviewQuestionPayload,
): Promise<InterviewQuestion> {
  return api.patch<InterviewQuestion>(`/interview-questions/${id}`, payload).then((r) => r.data);
}

export function deleteInterviewQuestion(id: string): Promise<void> {
  return api.delete(`/interview-questions/${id}`).then(() => undefined);
}
