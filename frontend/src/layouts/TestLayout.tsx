import { Outlet } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui';
import { uz } from '@/i18n/uz';
import { useTheme } from '@/theme/useTheme';

/**
 * Test topshirish layouti — diqqatni jamlash uchun yon menyusiz, sodda.
 * Chiqish/yakunlash test jarayonining ichida boshqariladi (mobil-first).
 */
export function TestLayout() {
  const { theme, toggle } = useTheme();

  return (
    <div className="flex min-h-full flex-col bg-gray-50 dark:bg-gray-900">
      <header className="flex h-14 items-center border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-1 justify-center">
          <Logo className="h-6 w-auto" />
        </div>
        <Button
          variant="secondary"
          size="icon"
          title={theme === 'dark' ? uz.theme.light : uz.theme.dark}
          aria-label={theme === 'dark' ? uz.theme.light : uz.theme.dark}
          onClick={toggle}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </Button>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
