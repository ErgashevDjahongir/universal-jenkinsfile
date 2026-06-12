import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { UserRole } from '@/auth/roles';
import { useAuth } from '@/auth/useAuth';
import { Spinner } from '@/components/ui';

interface ProtectedRouteProps {
  /** Berilsa, faqat shu rollar kira oladi; aks holda har qanday autentifikatsiya yetarli. */
  roles?: UserRole[];
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="flex min-h-full items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (status === 'unauthenticated' || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Birinchi kirish oqimi: parol almashtirilishi majburiy bo'lsa /profile ga yo'naltir
  if (user.mustChangePassword && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <Outlet />;
}
