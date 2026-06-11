import { type ReactNode } from 'react';
import { uz } from '@/i18n/uz';
import { Button } from './Button';
import { Spinner } from './Spinner';

/**
 * Ma'lumot komponentlari uchun 4 holat asosi: loading / xato / bo'sh / data.
 * Har bir ma'lumot ko'rsatadigan joyda shu bilan o'rab chiqiladi.
 */
interface DataStateProps {
  loading: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyText?: string;
  onRetry?: () => void;
  children: ReactNode;
}

export function DataState({
  loading,
  error,
  isEmpty,
  emptyText,
  onRetry,
  children,
}: DataStateProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
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
      <div className="py-12 text-center text-sm text-slate-400">
        {emptyText ?? uz.common.noData}
      </div>
    );
  }

  return <>{children}</>;
}
