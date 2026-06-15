import { api } from './client';

export type CandidateStatus = 'pending' | 'in_progress' | 'completed' | 'no_show';
export type DocumentType = 'recommendation' | 'reference' | 'application';

export interface CandidateAssignmentView {
  id: string;
  templateId: string;
  templateName: string | null;
  title: string;
  startsAt: string;
  endsAt: string;
  accessCode: string | null;
}

export interface CandidateListRow {
  id: string;
  fullName: string;
  phone: string;
  status: CandidateStatus;
  createdAt: string;
  assignment: CandidateAssignmentView | null;
}

export interface CandidateDocumentView {
  id: string;
  docType: DocumentType;
  originalName: string;
  fileSize: number;
  uploadedAt: string;
}

export interface CandidateResultView {
  sessionId: string;
  status: string;
  finishedAt: string | null;
  score: string | null;
  maxScore: string | null;
  percent: string | null;
  passed: boolean | null;
  grade: string | null;
  correctCount: number | null;
  totalCount: number | null;
}

export interface CandidateDetail {
  id: string;
  fullName: string;
  phone: string;
  status: CandidateStatus;
  createdAt: string;
  updatedAt: string;
  documents: CandidateDocumentView[];
  assignment: CandidateAssignmentView | null;
  result: CandidateResultView | null;
}

export interface CreateCandidateDto {
  fullName: string;
  phone: string;
}

export interface UpdateCandidateDto {
  fullName?: string;
  phone?: string;
}

export interface AssignCandidateDto {
  templateId: string;
  title: string;
  startsAt: string;
  endsAt: string;
}

export interface UpdateCandidateAssignmentDto {
  templateId?: string;
  title?: string;
  startsAt?: string;
  endsAt?: string;
}

export interface CandidateAssignmentResult {
  assignment: CandidateAssignmentView;
  code: { id: string; code: string };
}

export type CandidateView = 'current' | 'archived';

export interface CandidateFilter {
  status?: CandidateStatus;
  view?: CandidateView;
  search?: string;
}

export async function getCandidates(filter?: CandidateFilter): Promise<CandidateListRow[]> {
  const { data } = await api.get<CandidateListRow[]>('/candidates', { params: filter });
  return data;
}

export async function getCandidate(id: string): Promise<CandidateDetail> {
  const { data } = await api.get<CandidateDetail>(`/candidates/${id}`);
  return data;
}

export async function createCandidate(dto: CreateCandidateDto): Promise<CandidateDetail> {
  const { data } = await api.post<CandidateDetail>('/candidates', dto);
  return data;
}

export async function updateCandidate(
  id: string,
  dto: UpdateCandidateDto,
): Promise<CandidateDetail> {
  const { data } = await api.patch<CandidateDetail>(`/candidates/${id}`, dto);
  return data;
}

export async function deleteCandidate(id: string): Promise<void> {
  await api.delete(`/candidates/${id}`);
}

export async function uploadCandidateDocument(
  candidateId: string,
  docType: DocumentType,
  file: File,
): Promise<CandidateDocumentView> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<CandidateDocumentView>(
    `/candidates/${candidateId}/documents/${docType}`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

export async function deleteCandidateDocument(
  candidateId: string,
  docType: DocumentType,
): Promise<void> {
  await api.delete(`/candidates/${candidateId}/documents/${docType}`);
}

export async function downloadCandidateDocument(
  candidateId: string,
  docType: DocumentType,
  originalName: string,
): Promise<void> {
  const { data, headers } = await api.get(
    `/candidates/${candidateId}/documents/${docType}/download`,
    { responseType: 'blob' },
  );
  const blob = data as Blob;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const disposition = (headers as Record<string, string>)['content-disposition'] ?? '';
  const match = /filename\*?=(?:UTF-8'')?(.+)/i.exec(disposition);
  a.href = url;
  a.download = match ? decodeURIComponent(match[1].replace(/['"]/g, '')) : originalName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchCandidateDocumentUrl(
  candidateId: string,
  docType: DocumentType,
): Promise<string> {
  const { data } = await api.get(`/candidates/${candidateId}/documents/${docType}/download`, {
    responseType: 'blob',
  });
  return URL.createObjectURL(data as Blob);
}

export async function assignCandidate(
  candidateId: string,
  dto: AssignCandidateDto,
): Promise<CandidateAssignmentResult> {
  const { data } = await api.post<CandidateAssignmentResult>(
    `/candidates/${candidateId}/assignment`,
    dto,
  );
  return data;
}

export async function updateCandidateAssignment(
  candidateId: string,
  dto: UpdateCandidateAssignmentDto,
): Promise<CandidateAssignmentView> {
  const { data } = await api.patch<CandidateAssignmentView>(
    `/candidates/${candidateId}/assignment`,
    dto,
  );
  return data;
}
