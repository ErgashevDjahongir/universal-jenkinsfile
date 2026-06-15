import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, id, className, children, ...props },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        aria-invalid={error ? true : undefined}
        className={cn(
          'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900',
          'focus:outline-none focus:ring-2',
          'dark:bg-gray-700 dark:text-gray-100',
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500/30 dark:border-red-500'
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/30 dark:border-gray-600 dark:focus:border-blue-400',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
});
