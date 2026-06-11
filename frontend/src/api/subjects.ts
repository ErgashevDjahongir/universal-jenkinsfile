import { api } from './client';

export interface Subject {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  subjectId: string;
  name: string;
  parentId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateSubjectDto {
  name: string;
  description?: string;
}

export interface UpdateSubjectDto {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateCategoryDto {
  subjectId: string;
  name: string;
  parentId?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  isActive?: boolean;
}

export async function getSubjects(): Promise<Subject[]> {
  const { data } = await api.get<Subject[]>('/subjects');
  return data;
}

export async function createSubject(dto: CreateSubjectDto): Promise<Subject> {
  const { data } = await api.post<Subject>('/subjects', dto);
  return data;
}

export async function updateSubject(id: string, dto: UpdateSubjectDto): Promise<Subject> {
  const { data } = await api.patch<Subject>(`/subjects/${id}`, dto);
  return data;
}

export async function getCategories(subjectId: string): Promise<Category[]> {
  const { data } = await api.get<Category[]>('/categories', { params: { subjectId } });
  return data;
}

export async function createCategory(dto: CreateCategoryDto): Promise<Category> {
  const { data } = await api.post<Category>('/categories', dto);
  return data;
}

export async function updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category> {
  const { data } = await api.patch<Category>(`/categories/${id}`, dto);
  return data;
}
