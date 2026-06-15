import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Moon, Sun } from 'lucide-react';
import { roleLabel } from '@/auth/roles';
import { useAuth } from '@/auth/useAuth';
import { Button } from '@/components/ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/cn';
import { uz } from '@/i18n/uz';
import { navItems } from '@/routes/navItems';
import { useTheme } from '@/theme/useTheme';

/** Admin paneli layouti: yon menyu (sidebar) + yuqori panel (header). */
export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggle } = useTheme();

  const visibleItems = navItems.filter((item) => user && item.roles.includes(user.role));

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-200 bg-white md:flex overflow-y-auto dark:border-gray-700 dark:bg-gray-800">
        <div className="flex h-16 shrink-0 items-center px-4">
          <Logo className="h-10 w-auto" />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100',
                )
              }
            >
              <item.icon size={18} className="shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center border-b border-gray-200 bg-white px-6 dark:border-gray-700 dark:bg-gray-800">
          <Logo className="h-6 w-auto md:hidden" />
          <div className="ml-auto flex items-center gap-4">
            {user && (
              <NavLink to="/profile" className="text-right transition-opacity hover:opacity-80">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {roleLabel(user.role)}
                </div>
              </NavLink>
            )}
            <Button
              variant="secondary"
              size="icon"
              title={theme === 'dark' ? uz.theme.light : uz.theme.dark}
              aria-label={theme === 'dark' ? uz.theme.light : uz.theme.dark}
              onClick={toggle}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              title={uz.common.logout}
              aria-label={uz.common.logout}
              onClick={handleLogout}
            >
              <LogOut size={16} />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 2xl:max-w-[1536px]">
            {/* Sahifa qulasa, layout (sidebar/header) saqlanib qoladi va
                boshqa bo'limga o'tish mumkin; marshrut o'zgarsa chegara tiklanadi. */}
            <ErrorBoundary key={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
