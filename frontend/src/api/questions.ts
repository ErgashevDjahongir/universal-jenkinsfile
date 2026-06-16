import { api } from './client';
import type { Category } from './subjects';

export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'true_false'
  | 'matching'
  | 'ordering'
  | 'short_answer';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type QuestionStatus = 'draft' | 'approved' | 'active' | 'archived';

export interface QuestionOption {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
  orderIndex: number;
  matchPair: string | null;
}

export interface QuestionAttachment {
  id: string;
  questionId: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface Question {
  id: string;
  subjectId: string;
  type: QuestionType;
  difficulty: DifficultyLevel;
  text: string;
  points: string;
  status: QuestionStatus;
  explanation: string | null;
  answerKey: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  timesUsed: number;
  timesCorrect: number;
  createdAt: string;
  updatedAt: string;
  options: QuestionOption[];
  categories: Category[];
}

export interface QuestionOptionDto {
  text: string;
  isCorrect?: boolean;
  orderIndex?: number;
  matchPair?: string;
}

export interface CreateQuestionDto {
  subjectId: string;
  type: QuestionType;
  difficulty?: DifficultyLevel;
  text: string;
  points?: number;
  explanation?: string;
  answerKey?: string;
  categoryIds?: string[];
  options?: QuestionOptionDto[];
}

export type UpdateQuestionDto = Partial<CreateQuestionDto>;

export interface QuestionFilter {
  subjectId?: string;
  categoryId?: string;
  status?: QuestionStatus;
  difficulty?: DifficultyLevel;
  type?: QuestionType;
  search?: string;
}

export interface PaginatedQuestions {
  items: Question[];
  total: number;
  page: number;
  limit: number;
}

/** Sahifalangan savollar ro'yxati (savollar banki). */
export async function getQuestionsPage(
  filter: QuestionFilter,
  page: number,
  limit: number,
): Promise<PaginatedQuestions> {
  const { data } = await api.get<PaginatedQuestions>('/questions', {
    params: { ...filter, page, limit },
  });
  return data;
}

/** Filtrlangan barcha savollar (sahifalashsiz) — masalan shablon savol tanlash. */
export async function getQuestions(filter?: QuestionFilter): Promise<Question[]> {
  const { data } = await api.get<PaginatedQuestions>('/questions', { params: filter });
  return data.items;
}

export interface QuestionCounts {
  total: number;
  bySubject: { subjectId: string; count: number }[];
  byCategory: { categoryId: string; count: number }[];
}

/** Faol savollar soni: jami, fan va kategoriya bo'yicha. */
export async function getQuestionCounts(): Promise<QuestionCounts> {
  const { data } = await api.get<QuestionCounts>('/questions/counts');
  return data;
}

export async function getQuestion(id: string): Promise<Question> {
  const { data } = await api.get<Question>(`/questions/${id}`);
  return data;
}

export async function createQuestion(dto: CreateQuestionDto): Promise<Question> {
  const { data } = await api.post<Question>('/questions', dto);
  return data;
}

export async function updateQuestion(id: string, dto: UpdateQuestionDto): Promise<Question> {
  const { data } = await api.patch<Question>(`/questions/${id}`, dto);
  return data;
}

export async function approveQuestion(id: string): Promise<Question> {
  const { data } = await api.post<Question>(`/questions/${id}/approve`);
  return data;
}

export async function activateQuestion(id: string): Promise<Question> {
  const { data } = await api.post<Question>(`/questions/${id}/activate`);
  return data;
}

export async function archiveQuestion(id: string): Promise<Question> {
  const { data } = await api.post<Question>(`/questions/${id}/archive`);
  return data;
}

export async function uploadAttachment(
  questionId: string,
  file: File,
): Promise<QuestionAttachment> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<QuestionAttachment>(
    `/questions/${questionId}/attachments`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

export async function getAttachments(questionId: string): Promise<QuestionAttachment[]> {
  const { data } = await api.get<QuestionAttachment[]>(`/questions/${questionId}/attachments`);
  return data;
}
