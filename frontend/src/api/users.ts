import { api } from './client';

export type UserRole = 'super_admin' | 'admin' | 'expert' | 'examinee';
export type UserStatus = 'active' | 'blocked' | 'archived';

export interface UserListItem {
  id: string;
  lastName: string;
  firstName: string;
  middleName: string | null;
  login: string | null;
  phone: string | null;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  departmentId: string | null;
  positionId: string | null;
  isCandidate: boolean;
  createdAt: string;
}

export interface UserFilter {
  role?: UserRole;
  status?: UserStatus;
  departmentId?: string;
}

export type StaffRole = 'super_admin' | 'admin' | 'expert';

export interface CreateUserDto {
  lastName: string;
  firstName: string;
  middleName?: string;
  login?: string;
  password?: string;
  phone?: string;
  email?: string;
  role: StaffRole;
  departmentId?: string;
  positionId?: string;
}

export type UpdateUserDto = Partial<CreateUserDto>;

export async function getUsers(filter?: UserFilter): Promise<UserListItem[]> {
  const { data } = await api.get<UserListItem[]>('/users', { params: filter });
  return data;
}

export async function createUser(dto: CreateUserDto): Promise<UserListItem> {
  const { data } = await api.post<UserListItem>('/users', dto);
  return data;
}

export async function updateUser(id: string, dto: UpdateUserDto): Promise<UserListItem> {
  const { data } = await api.patch<UserListItem>(`/users/${id}`, dto);
  return data;
}

export async function blockUser(id: string): Promise<UserListItem> {
  const { data } = await api.post<UserListItem>(`/users/${id}/block`);
  return data;
}

export async function activateUser(id: string): Promise<UserListItem> {
  const { data } = await api.post<UserListItem>(`/users/${id}/activate`);
  return data;
}
