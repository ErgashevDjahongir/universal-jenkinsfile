import { type ReactNode } from 'react';
import { uz } from '@/i18n/uz';
import { Button } from './Button';

/**
 * Ma'lumot komponentlari uchun 4 holat asosi (frontend-style skili):
 *  - loading — skeleton (animate-pulse)
 *  - xato — danger rang + qayta urinish tugmasi
 *  - bo'sh — tushuntiruvchi matn + ixtiyoriy amal tugmasi
 *  - data — asosiy ko'rinish (children)
 * Har bir ma'lumot ko'rsatadigan joyda shu bilan o'rab chiqiladi.
 */
interface DataStateProps {
  loading: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyText?: string;
  /** Bo'sh holatda ko'rsatiladigan amal (masalan "Qo'shish" tugmasi). */
  emptyAction?: ReactNode;
  onRetry?: () => void;
  children: ReactNode;
}

export function DataState({
  loading,
  error,
  isEmpty,
  emptyText,
  emptyAction,
  onRetry,
  children,
}: DataStateProps) {
  if (loading) {
    return (
      <div className="space-y-3 p-6" aria-busy="true" aria-live="polite">
        <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
        <div className="h-4 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <p className="text-sm text-red-600">{error}</p>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {uz.common.retry}
          </Button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <p className="text-sm text-gray-500">{emptyText ?? uz.common.noData}</p>
        {emptyAction}
      </div>
    );
  }

  return <>{children}</>;
}
