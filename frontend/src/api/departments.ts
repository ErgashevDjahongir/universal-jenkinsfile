import { api } from './client';

export interface Department {
  id: string;
  name: string;
  parentId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  id: string;
  name: string;
  departmentId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateDepartmentDto {
  name: string;
  parentId?: string;
}
export interface UpdateDepartmentDto {
  name?: string;
  parentId?: string;
  isActive?: boolean;
}
export interface CreatePositionDto {
  name: string;
  departmentId?: string;
}
export interface UpdatePositionDto {
  name?: string;
  departmentId?: string;
  isActive?: boolean;
}

export async function getDepartments(): Promise<Department[]> {
  const { data } = await api.get<Department[]>('/departments');
  return data;
}

export async function createDepartment(dto: CreateDepartmentDto): Promise<Department> {
  const { data } = await api.post<Department>('/departments', dto);
  return data;
}

export async function updateDepartment(id: string, dto: UpdateDepartmentDto): Promise<Department> {
  const { data } = await api.patch<Department>(`/departments/${id}`, dto);
  return data;
}

export async function deleteDepartment(id: string): Promise<void> {
  await api.delete(`/departments/${id}`);
}

export async function getPositions(departmentId?: string): Promise<Position[]> {
  const { data } = await api.get<Position[]>('/positions', {
    params: departmentId ? { departmentId } : undefined,
  });
  return data;
}

export async function createPosition(dto: CreatePositionDto): Promise<Position> {
  const { data } = await api.post<Position>('/positions', dto);
  return data;
}

export async function updatePosition(id: string, dto: UpdatePositionDto): Promise<Position> {
  const { data } = await api.patch<Position>(`/positions/${id}`, dto);
  return data;
}

export async function deletePosition(id: string): Promise<void> {
  await api.delete(`/positions/${id}`);
}
