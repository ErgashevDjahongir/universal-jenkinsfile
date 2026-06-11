import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { roleLabel } from '@/auth/roles';
import { useAuth } from '@/auth/useAuth';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { uz } from '@/i18n/uz';
import { navItems } from '@/routes/navItems';

/** Admin paneli layouti: yon menyu (sidebar) + yuqori panel (header). */
export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const visibleItems = navItems.filter((item) => user && item.roles.includes(user.role));

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-full bg-gray-50">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="flex h-16 items-center px-6">
          <span className="text-lg font-semibold text-gray-900">{uz.app.name}</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center border-b border-gray-200 bg-white px-6">
          <span className="text-base font-semibold text-gray-900 md:hidden">{uz.app.name}</span>
          <div className="ml-auto flex items-center gap-4">
            {user && (
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-xs text-gray-500">{roleLabel(user.role)}</div>
              </div>
            )}
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              {uz.common.logout}
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
