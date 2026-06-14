import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface PageHeaderProps {
  /** Sahifa nomi (sarlavha). */
  title: ReactNode;
  /** Sarlavha yonidagi qo'shimcha (masalan, son ko'rsatkichi yoki holat belgisi). */
  aside?: ReactNode;
  /** O'ng tomondagi amallar (tugmalar). */
  actions?: ReactNode;
  /** Sarlavhadan oldin chap tomonda (masalan, "Orqaga" tugmasi). */
  leading?: ReactNode;
  className?: string;
}

/**
 * Barcha sahifalar uchun yagona sarlavha bloki — oq karta fonida.
 * Sahifa nomini izchil ko'rinishda beradi; ixtiyoriy yonidagi ko'rsatkich va amallar bilan.
 */
export function PageHeader({ title, aside, actions, leading, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-6 py-4',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {leading}
        <div className="flex min-w-0 items-baseline gap-3">
          <h1 className="truncate text-2xl font-semibold text-gray-900">{title}</h1>
          {aside}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
