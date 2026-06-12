import { Outlet } from 'react-router-dom';
import { uz } from '@/i18n/uz';

/**
 * Test topshirish layouti — diqqatni jamlash uchun yon menyusiz, sodda.
 * Chiqish/yakunlash test jarayonining ichida boshqariladi (mobil-first).
 */
export function TestLayout() {
  return (
    <div className="flex min-h-full flex-col bg-gray-50">
      <header className="flex h-14 items-center justify-center border-b border-gray-200 bg-white px-4">
        <span className="text-base font-semibold text-gray-900">{uz.app.name}</span>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
