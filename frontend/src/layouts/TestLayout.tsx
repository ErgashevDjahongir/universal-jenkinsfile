import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { Button } from '@/components/ui';
import { uz } from '@/i18n/uz';

/**
 * Test topshirish layouti — diqqatni jamlash uchun yon menyusiz, sodda.
 * (Test jarayoni mazmuni keyingi bosqichda to'ldiriladi.)
 */
export function TestLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
        <span className="text-lg font-semibold text-slate-900">{uz.app.name}</span>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          {uz.common.logout}
        </Button>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
