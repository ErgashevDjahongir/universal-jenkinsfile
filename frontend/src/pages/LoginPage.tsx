import { useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { Button, Input } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { uz } from '@/i18n/uz';
import { UserRole } from '@/auth/roles';

interface LocationState {
  from?: { pathname?: string };
}

export function LoginPage() {
  const { login, status, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated' && user && user.role !== UserRole.EXAMINEE) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!loginValue.trim()) {
      setError(uz.auth.requiredLogin);
      return;
    }
    if (!password) {
      setError(uz.auth.requiredPassword);
      return;
    }

    setSubmitting(true);
    try {
      await login(loginValue.trim(), password);
      const state = location.state as LocationState | null;
      navigate(state?.from?.pathname ?? '/', { replace: true });
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        setError(uz.auth.invalidCredentials);
      } else {
        setError(uz.common.connectionError);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo className="h-16 w-auto" />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-center text-2xl font-bold text-gray-900">{uz.auth.loginTitle}</h2>
        <p className="mt-1 text-center text-sm text-gray-500">{uz.auth.loginSubtitle}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            label={uz.auth.loginLabel}
            placeholder={uz.auth.loginPlaceholder}
            autoComplete="username"
            value={loginValue}
            onChange={(e) => setLoginValue(e.target.value)}
            disabled={submitting}
          />
          <Input
            label={uz.auth.passwordLabel}
            placeholder={uz.auth.passwordPlaceholder}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" className="w-full" loading={submitting} disabled={submitting}>
            {submitting ? uz.auth.submitting : uz.auth.submit}
          </Button>
        </form>
      </div>

      {/* Test topshiruvchilar bir martalik kod orqali alohida sahifada kiradi. */}
      <p className="mt-6 text-center text-sm text-gray-500">
        {uz.auth.candidatePrompt}{' '}
        <Link to="/start" className="font-medium text-blue-600 hover:text-blue-700">
          {uz.auth.candidateLink}
        </Link>
      </p>
    </div>
  );
}
