import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '@/api/auth';
import { useAuth } from '@/auth/useAuth';
import { Button, Input } from '@/components/ui';
import { uz } from '@/i18n/uz';

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMustChange = user?.mustChangePassword ?? false;

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function validate(): string | null {
    if (!current) return uz.profile.currentRequired;
    if (!next) return uz.profile.newRequired;
    if (next.length < 8) return uz.profile.passwordTooShort;
    if (!PASSWORD_REGEX.test(next)) return uz.profile.passwordComplexity;
    if (!confirm) return uz.profile.confirmRequired;
    if (next !== confirm) return uz.profile.passwordMismatch;
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      setSuccess(true);
      setCurrent('');
      setNext('');
      setConfirm('');
      if (isMustChange) {
        // Sessiyani yangilash uchun chiqib qayta kiring
        await logout();
        navigate('/login', { replace: true });
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(msg ?? uz.profile.wrongCurrentPassword);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">{uz.profile.title}</h1>

      {isMustChange && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {uz.profile.mustChangeNotice}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-medium text-gray-900">
          {uz.profile.changePasswordTitle}
        </h2>

        {success && !isMustChange && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {uz.profile.success}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label={uz.profile.currentPassword}
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder={uz.profile.currentPasswordPlaceholder}
            autoComplete="current-password"
            required
          />
          <Input
            label={uz.profile.newPassword}
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder={uz.profile.newPasswordPlaceholder}
            autoComplete="new-password"
            required
          />
          <Input
            label={uz.profile.confirmPassword}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={uz.profile.confirmPasswordPlaceholder}
            autoComplete="new-password"
            required
          />

          <div className="pt-2">
            <Button type="submit" variant="primary" loading={loading} className="w-full">
              {loading ? uz.profile.submitting : uz.profile.submit}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
