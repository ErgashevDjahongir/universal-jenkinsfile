import { useAuth } from '@/auth/useAuth';
import { Card } from '@/components/ui';
import { uz } from '@/i18n/uz';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">{uz.nav.dashboard}</h1>
      <Card>
        <p className="text-sm text-slate-600">
          {uz.auth.welcome}, {user?.firstName}!
        </p>
        <p className="mt-1 text-sm text-slate-400">{uz.common.comingSoon}</p>
      </Card>
    </div>
  );
}
