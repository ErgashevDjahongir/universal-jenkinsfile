import { Navigate } from 'react-router-dom';
import { UserRole } from '@/auth/roles';
import { useAuth } from '@/auth/useAuth';
import { Spinner } from '@/components/ui';

/** Ildiz ("/") — autentifikatsiya holati va rolga qarab yo'naltiradi. */
export function HomeRedirect() {
  const { status, user } = useAuth();

  if (status === 'loading') {
    return (
      <div className="flex min-h-full items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Examinee — kod orqali test; ekspert — test topshiruvchilar ro'yxati; qolgan — dashboard.
  const target =
    user.role === UserRole.EXAMINEE
      ? '/start'
      : user.role === UserRole.EXPERT
        ? '/candidates'
        : '/dashboard';
  return <Navigate to={target} replace />;
}
