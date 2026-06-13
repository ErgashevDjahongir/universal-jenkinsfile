import { Outlet } from 'react-router-dom';
import { Logo } from '@/components/Logo';

/**
 * Test topshirish layouti — diqqatni jamlash uchun yon menyusiz, sodda.
 * Chiqish/yakunlash test jarayonining ichida boshqariladi (mobil-first).
 */
export function TestLayout() {
  return (
    <div className="flex min-h-full flex-col bg-gray-50">
      <header className="flex h-14 items-center justify-center border-b border-gray-200 bg-white px-4">
        <Logo className="h-6 w-auto" />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
