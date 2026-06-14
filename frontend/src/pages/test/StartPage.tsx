import { Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { Card } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { uz } from '@/i18n/uz';
import { CandidateCodeForm } from './CandidateCodeForm';

export function StartPage() {
  const { status, user } = useAuth();

  if (status === 'authenticated' && user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo className="h-16 w-auto" />
      </div>

      <Card>
        <h2 className="text-center text-2xl font-bold text-gray-900">{uz.test.entryTitle}</h2>
        <p className="mt-1 text-center text-sm text-gray-500">{uz.test.entrySubtitle}</p>
        <CandidateCodeForm />
      </Card>
    </div>
  );
}
