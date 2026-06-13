import { api } from './client';

export interface AssignmentTarget {
  id: string;
  assignmentId: string;
  userId: string | null;
  groupId: string | null;
}

export interface AccessCode {
  id: string;
  assignmentId: string;
  code: string;
  userId: string | null;
  usedAt: string | null;
  createdAt: string;
}

export interface TestAssignment {
  id: string;
  templateId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  createdBy: string | null;
  createdAt: string;
  template?: { id: string; title: string; status: string };
  targets: AssignmentTarget[];
  codes: AccessCode[];
}

export interface AssignmentTargetDto {
  userId?: string;
  groupId?: string;
}

export interface CreateAssignmentDto {
  templateId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  targets: AssignmentTargetDto[];
}

export interface UpdateAssignmentDto {
  title?: string;
  startsAt?: string;
  endsAt?: string;
}

export interface GenerateCodesDto {
  perUser?: boolean;
  count?: number;
}

export interface AssignmentFilter {
  templateId?: string;
}

export async function getAssignments(filter?: AssignmentFilter): Promise<TestAssignment[]> {
  const { data } = await api.get<TestAssignment[]>('/assignments', { params: filter });
  return data;
}

export async function getAssignment(id: string): Promise<TestAssignment> {
  const { data } = await api.get<TestAssignment>(`/assignments/${id}`);
  return data;
}

export async function createAssignment(dto: CreateAssignmentDto): Promise<TestAssignment> {
  const { data } = await api.post<TestAssignment>('/assignments', dto);
  return data;
}

export async function updateAssignment(
  id: string,
  dto: UpdateAssignmentDto,
): Promise<TestAssignment> {
  const { data } = await api.patch<TestAssignment>(`/assignments/${id}`, dto);
  return data;
}

export async function deleteAssignment(id: string): Promise<void> {
  await api.delete(`/assignments/${id}`);
}

export async function generateCodes(id: string, dto: GenerateCodesDto): Promise<AccessCode[]> {
  const { data } = await api.post<AccessCode[]>(`/assignments/${id}/codes`, dto);
  return data;
}

export async function listCodes(id: string): Promise<AccessCode[]> {
  const { data } = await api.get<AccessCode[]>(`/assignments/${id}/codes`);
  return data;
}

export interface UserGroup {
  id: string;
  name: string;
  memberCount: number;
}

export async function getGroups(): Promise<UserGroup[]> {
  const { data } = await api.get<UserGroup[]>('/assignments/groups');
  return data;
}
