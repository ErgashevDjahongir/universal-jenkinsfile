import { createContext } from 'react';
import type { AuthUser } from '@/api/auth';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (login: string, password: string) => Promise<void>;
  /** Tokenlar boshqa yo'l bilan olingach (masalan kod orqali kirish) sessiyani o'rnatadi. */
  establishSession: (user: AuthUser) => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
