import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchMe, login as apiLogin, logout as apiLogout, type AuthUser } from '@/api/auth';
import { setAuthFailureHandler } from '@/api/client';
import { AuthContext, type AuthStatus } from './context';
import { tokenStorage } from './tokenStorage';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  // Refresh ham ishlamay qolganda sessiyani tugatadi.
  useEffect(() => {
    setAuthFailureHandler(() => {
      setUser(null);
      setStatus('unauthenticated');
    });
    return () => setAuthFailureHandler(null);
  }, []);

  // Ilk yuklanishda sessiyani tiklash: refresh token bo'lsa /auth/me orqali
  // (access token yo'q → 401 → interceptor refresh qiladi → qayta urinadi).
  useEffect(() => {
    let active = true;
    if (!tokenStorage.getRefreshToken()) {
      setStatus('unauthenticated');
      return;
    }
    fetchMe()
      .then((u) => {
        if (active) {
          setUser(u);
          setStatus('authenticated');
        }
      })
      .catch(() => {
        if (active) {
          setUser(null);
          setStatus('unauthenticated');
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (loginValue: string, password: string) => {
    const res = await apiLogin(loginValue, password);
    setUser(res.user);
    setStatus('authenticated');
  }, []);

  // Kod orqali kirishda tokenlar allaqachon saqlangan — faqat kontekstni o'rnatamiz.
  const establishSession = useCallback((nextUser: AuthUser) => {
    setUser(nextUser);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo(
    () => ({ user, status, login, establishSession, logout }),
    [user, status, login, establishSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
