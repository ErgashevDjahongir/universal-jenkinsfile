import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from '@/auth/tokenStorage';

// Markazlashgan axios mijozi. Dev'da Vite proxy /api ni backendga yo'naltiradi.
// Prod'da VITE_API_URL ishlatiladi.
const baseURL = `${import.meta.env.VITE_API_URL ?? ''}/api`;

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Refresh ham muvaffaqiyatsiz bo'lganda (sessiya butunlay yaroqsiz) chaqiriladi.
 * AuthProvider buni ro'yxatdan o'tkazadi va foydalanuvchini login'ga yo'naltiradi.
 */
type AuthFailureHandler = () => void;
let onAuthFailure: AuthFailureHandler | null = null;

export function setAuthFailureHandler(handler: AuthFailureHandler | null): void {
  onAuthFailure = handler;
}

// Har bir so'rovga joriy access tokenni qo'shadi.
api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

// Bir vaqtning o'zida kelgan bir nechta 401 uchun yagona refresh so'rovi (single-flight).
let refreshPromise: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    throw new Error('Refresh token mavjud emas');
  }
  // Interceptor rekursiyasini oldini olish uchun toza axios ishlatamiz.
  const { data } = await axios.post<RefreshResponse>(
    `${baseURL}/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );
  tokenStorage.setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// 401 javobda access tokenni yangilab, asl so'rovni bir marta qayta yuboradi.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined;
    const status = error.response?.status;
    const isRefreshCall = original?.url?.includes('/auth/refresh');

    if (status === 401 && original && !original._retry && !isRefreshCall) {
      original._retry = true;
      try {
        refreshPromise ??= performRefresh().finally(() => {
          refreshPromise = null;
        });
        const newAccessToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(original);
      } catch {
        tokenStorage.clear();
        onAuthFailure?.();
      }
    }

    return Promise.reject(error);
  },
);
