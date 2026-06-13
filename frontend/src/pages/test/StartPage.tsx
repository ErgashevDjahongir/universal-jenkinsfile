import { useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { Button, Card, Input } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { uz } from '@/i18n/uz';
import { startSession, type StartSessionPayload } from '@/api/sessions';

/** Backend xato xabarini uz.ts kalidiga moslashtiradi. */
function mapServerError(msg: string): string {
  if (msg.includes('allaqachon ishlatilgan')) return uz.test.codeAlreadyUsed;
  if (msg.includes('hali boshlanmagan')) return uz.test.windowNotOpen;
  if (msg.includes('muddati tugagan')) return uz.test.windowClosed;
  if (msg.includes('allaqachon faol')) return uz.test.alreadyActive;
  if (msg.includes('Urinishlar soni')) return uz.test.maxAttempts;
  if (msg.includes('urinishgacha')) return uz.test.intervalNotPassed;
  // accessCode.invalid va boshqa noma'lum 400 xatolar
  return uz.test.codeInvalid;
}

export function StartPage() {
  const navigate = useNavigate();
  const { establishSession } = useAuth();

  const [code, setCode] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [phone, setPhone] = useState('');
  const [showRegistration, setShowRegistration] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError(uz.test.codeRequired);
      return;
    }
    if (showRegistration && (!lastName.trim() || !firstName.trim() || !phone.trim())) {
      setError(uz.test.registrationFieldsRequired);
      return;
    }

    const payload: StartSessionPayload = { code: code.trim() };
    if (showRegistration) {
      payload.lastName = lastName.trim();
      payload.firstName = firstName.trim();
      payload.phone = phone.trim();
      if (middleName.trim()) payload.middleName = middleName.trim();
    }

    setSubmitting(true);
    try {
      const { user, sessionId } = await startSession(payload);
      establishSession(user);
      navigate(`/test/${sessionId}`, { replace: true });
    } catch (err) {
      if (isAxiosError(err)) {
        const msg = (err.response?.data as { message?: string } | undefined)?.message ?? '';
        // Anonim kod — F.I.Sh./telefon talab qilinadi: ro'yxatga olish formasini ochamiz.
        if (err.response?.status === 400 && msg.includes('familiya') && !showRegistration) {
          setShowRegistration(true);
          setError(uz.test.registrationFieldsRequired);
          return;
        }
        setError(err.response?.status === 400 ? mapServerError(msg) : uz.test.startError);
        return;
      }
      setError(uz.common.connectionError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo className="h-16 w-auto" />
      </div>

      <Card>
        <h2 className="text-center text-2xl font-bold text-gray-900">{uz.test.entryTitle}</h2>
        <p className="mt-1 text-center text-sm text-gray-500">{uz.test.entrySubtitle}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            label={uz.test.codeLabel}
            placeholder={uz.test.codePlaceholder}
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={submitting}
          />

          {showRegistration && (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-600">{uz.test.registrationHint}</p>
              <Input
                label={uz.test.lastNameLabel}
                placeholder={uz.test.lastNamePlaceholder}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={submitting}
              />
              <Input
                label={uz.test.firstNameLabel}
                placeholder={uz.test.firstNamePlaceholder}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={submitting}
              />
              <Input
                label={uz.test.middleNameLabel}
                placeholder={uz.test.middleNamePlaceholder}
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                disabled={submitting}
              />
              <Input
                label={uz.test.phoneLabel}
                placeholder={uz.test.phonePlaceholder}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={submitting}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" className="w-full" loading={submitting} disabled={submitting}>
            {submitting ? uz.test.entering : uz.test.enter}
          </Button>
        </form>
      </Card>
    </div>
  );
}
