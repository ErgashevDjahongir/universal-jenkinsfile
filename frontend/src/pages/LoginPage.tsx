import { useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { Button, Input } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/cn';
import { uz } from '@/i18n/uz';
import { CandidateCodeForm } from './test/CandidateCodeForm';

interface LocationState {
  from?: { pathname?: string };
}

type Tab = 'staff' | 'candidate';

export function LoginPage() {
  const { login, status, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [tab, setTab] = useState<Tab>('staff');
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated' && user) {
    return <Navigate to="/" replace />;
  }

  function handleTabChange(next: Tab) {
    setTab(next);
    setError(null);
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

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {/* Tablar */}
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => handleTabChange('staff')}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors focus:outline-none',
              tab === 'staff'
                ? 'border-b-2 border-blue-600 bg-white text-blue-700'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
            )}
          >
            {uz.auth.tabStaff}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('candidate')}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors focus:outline-none',
              tab === 'candidate'
                ? 'border-b-2 border-blue-600 bg-white text-blue-700'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
            )}
          >
            {uz.auth.tabCandidate}
          </button>
        </div>

        {/* Tab kontent */}
        <div className="p-6">
          {tab === 'staff' ? (
            <>
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
            </>
          ) : (
            <>
              <h2 className="text-center text-2xl font-bold text-gray-900">{uz.test.entryTitle}</h2>
              <p className="mt-1 text-center text-sm text-gray-500">{uz.test.entrySubtitle}</p>
              <CandidateCodeForm />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
