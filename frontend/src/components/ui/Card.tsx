import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  actions?: ReactNode;
}

export function Card({ title, actions, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm', className)}
      {...props}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
