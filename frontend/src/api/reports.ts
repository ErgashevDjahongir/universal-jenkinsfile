import { api } from './client';

export interface DashboardStats {
  totalQuestions: number;
  activeTemplates: number;
  todaySessions: number;
  pendingAssignments: number;
  recentResults: RecentResult[];
  activeSessions: ActiveSessionRow[];
}

export interface RecentResult {
  sessionId: string;
  userId: string;
  fullName: string;
  assignmentTitle: string;
  score: string | null;
  maxScore: string | null;
  percent: string | null;
  passed: boolean | null;
  finishedAt: string | null;
}

export interface ActiveSessionRow {
  sessionId: string;
  userId: string;
  fullName: string;
  assignmentTitle: string;
  startedAt: string;
  deadlineAt: string;
  tabSwitches: number;
}

export interface RankingRow {
  rank: number;
  sessionId: string;
  userId: string;
  fullName: string;
  departmentName: string | null;
  assignmentTitle: string;
  templateTitle: string;
  score: string | null;
  maxScore: string | null;
  percent: string | null;
  passed: boolean | null;
  grade: string | null;
  finishedAt: string | null;
}

export interface QuestionAnalysisRow {
  questionId: string;
  text: string;
  subjectId: string;
  timesUsed: number;
  timesCorrect: number;
  errorCount: number;
  errorRate: number;
}

export interface ReportFilter {
  departmentId?: string;
  templateId?: string;
  assignmentId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function getDashboard(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>('/reports/dashboard');
  return data;
}

export async function getRankings(filter?: ReportFilter): Promise<RankingRow[]> {
  const { data } = await api.get<RankingRow[]>('/reports/rankings', { params: filter });
  return data;
}

export async function getQuestionAnalysis(): Promise<QuestionAnalysisRow[]> {
  const { data } = await api.get<QuestionAnalysisRow[]>('/reports/questions/analysis');
  return data;
}

export function getExcelUrl(filter?: ReportFilter): string {
  const params = new URLSearchParams();
  if (filter?.departmentId) params.set('departmentId', filter.departmentId);
  if (filter?.templateId) params.set('templateId', filter.templateId);
  if (filter?.assignmentId) params.set('assignmentId', filter.assignmentId);
  if (filter?.dateFrom) params.set('dateFrom', filter.dateFrom);
  if (filter?.dateTo) params.set('dateTo', filter.dateTo);
  const qs = params.toString();
  return `/reports/export/excel${qs ? '?' + qs : ''}`;
}

export function getPdfUrl(sessionId: string): string {
  return `/reports/export/pdf/${sessionId}`;
}

export async function downloadExcel(filter?: ReportFilter): Promise<void> {
  const { data } = await api.get<Blob>('/reports/export/excel', {
    params: filter,
    responseType: 'blob',
  });
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'etest-natijalar.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadPdf(sessionId: string): Promise<void> {
  const { data } = await api.get<Blob>(`/reports/export/pdf/${sessionId}`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sertifikat-${sessionId}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
