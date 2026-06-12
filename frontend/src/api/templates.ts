import { api } from './client';

export type TemplateStatus = 'draft' | 'active' | 'archived';
export type NavigationMode = 'free' | 'forward_only';
export type ResultVisibility = 'immediately_full' | 'immediately_score' | 'hidden';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type GradeValue = 'excellent' | 'good' | 'satisfactory' | 'unsatisfactory';

export interface GradeScaleItem {
  id: string;
  templateId: string;
  grade: GradeValue;
  minPercent: string;
}

export interface FixedQuestion {
  id: string;
  templateId: string;
  questionId: string;
  pointsOverride: string | null;
  orderIndex: number;
}

export interface SelectionRule {
  id: string;
  templateId: string;
  subjectId: string;
  categoryId: string | null;
  difficulty: DifficultyLevel | null;
  questionCount: number;
}

export interface SelectionShortage {
  ruleIndex: number;
  subjectId: string;
  categoryId: string | null;
  difficulty: DifficultyLevel | null;
  requested: number;
  available: number;
  missing: number;
}

export interface TestTemplate {
  id: string;
  title: string;
  description: string | null;
  status: TemplateStatus;
  timeLimitMinutes: number;
  passingScorePercent: string;
  maxAttempts: number;
  attemptIntervalMinutes: number;
  navigation: NavigationMode;
  resultVisibility: ResultVisibility;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  partialScoring: boolean;
  negativeMarking: boolean;
  negativePoints: string;
  avoidRepeatQuestions: boolean;
  maxTabSwitches: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  gradeScale: GradeScaleItem[];
  fixedQuestions: FixedQuestion[];
  selectionRules: SelectionRule[];
}

export interface GradeScaleItemDto {
  grade: GradeValue;
  minPercent: number;
}

export interface FixedQuestionDto {
  questionId: string;
  pointsOverride?: number;
}

export interface SelectionRuleDto {
  subjectId: string;
  categoryId?: string;
  difficulty?: DifficultyLevel;
  questionCount: number;
}

export interface CreateTemplateDto {
  title: string;
  description?: string;
  timeLimitMinutes?: number;
  passingScorePercent?: number;
  maxAttempts?: number;
  attemptIntervalMinutes?: number;
  navigation?: NavigationMode;
  resultVisibility?: ResultVisibility;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  partialScoring?: boolean;
  negativeMarking?: boolean;
  negativePoints?: number;
  avoidRepeatQuestions?: boolean;
  maxTabSwitches?: number;
  gradeScale?: GradeScaleItemDto[];
  fixedQuestions?: FixedQuestionDto[];
  selectionRules?: SelectionRuleDto[];
}

export type UpdateTemplateDto = Partial<CreateTemplateDto>;

export interface TemplateFilter {
  status?: TemplateStatus;
}

export async function getTemplates(filter?: TemplateFilter): Promise<TestTemplate[]> {
  const { data } = await api.get<TestTemplate[]>('/templates', { params: filter });
  return data;
}

export async function getTemplate(id: string): Promise<TestTemplate> {
  const { data } = await api.get<TestTemplate>(`/templates/${id}`);
  return data;
}

export async function createTemplate(dto: CreateTemplateDto): Promise<TestTemplate> {
  const { data } = await api.post<TestTemplate>('/templates', dto);
  return data;
}

export async function updateTemplate(id: string, dto: UpdateTemplateDto): Promise<TestTemplate> {
  const { data } = await api.patch<TestTemplate>(`/templates/${id}`, dto);
  return data;
}

export async function activateTemplate(id: string): Promise<TestTemplate> {
  const { data } = await api.post<TestTemplate>(`/templates/${id}/activate`);
  return data;
}

export async function archiveTemplate(id: string): Promise<TestTemplate> {
  const { data } = await api.post<TestTemplate>(`/templates/${id}/archive`);
  return data;
}

export async function checkTemplateSelection(id: string): Promise<SelectionShortage[]> {
  const { data } = await api.get<SelectionShortage[]>(`/templates/${id}/selection-check`);
  return data;
}
