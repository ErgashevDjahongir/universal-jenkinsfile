import { tokenStorage } from '@/auth/tokenStorage';
import { UserRole } from '@/auth/roles';
import { api } from './client';

/** Backend /auth javoblaridagi foydalanuvchi konteksti. */
export interface AuthUser {
  id: string;
  login: string | null;
  role: UserRole;
  firstName: string;
  lastName: string;
  mustChangePassword: boolean;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/** Login + parol bilan kirish; tokenlarni saqlaydi. */
export async function login(loginValue: string, password: string): Promise<AuthResult> {
  const { data } = await api.post<AuthResult>('/auth/login', {
    login: loginValue,
    password,
  });
  tokenStorage.setTokens(data.accessToken, data.refreshToken);
  return data;
}

/** Joriy foydalanuvchini qaytaradi (sessiyani tiklash uchun ishlatiladi). */
export async function fetchMe(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/auth/me');
  return data;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

/** Parolni almashtiradi. */
export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await api.post('/auth/change-password', payload);
}

/** Chiqish — refresh tokenni serverda bekor qiladi va lokal saqlovni tozalaydi. */
export async function logout(): Promise<void> {
  const refreshToken = tokenStorage.getRefreshToken();
  try {
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken });
    }
  } finally {
    tokenStorage.clear();
  }
}
