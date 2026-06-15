import { useId, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

export interface ComboboxOption {
  value: string;
  label: string;
  /** Ikkilamchi matn (masalan, login yoki a'zolar soni). */
  sublabel?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  /** Mos natija topilmaganda ko'rsatiladigan matn. */
  emptyText?: string;
  disabled?: boolean;
  error?: string;
}

/**
 * Qidiriladigan tanlov (combobox): foydalanuvchi/guruhni nomi bo'yicha izlab tanlaydi.
 * Tanlangan qiymat label ko'rinishida ko'rsatiladi; yozish bilan ro'yxat filtrlanadi.
 */
export function Combobox({
  options,
  value,
  onChange,
  label,
  placeholder,
  emptyText,
  disabled,
  error,
}: ComboboxProps) {
  const autoId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.sublabel?.toLowerCase().includes(q) ?? false),
    );
  }, [options, query]);

  function commit(next: string) {
    onChange(next);
    setQuery('');
    setOpen(false);
  }

  return (
    <div className="relative space-y-1.5">
      {label && (
        <label
          htmlFor={autoId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
      )}
      <input
        id={autoId}
        type="text"
        autoComplete="off"
        disabled={disabled}
        value={open ? query : (selected?.label ?? '')}
        placeholder={selected ? selected.label : placeholder}
        aria-invalid={error ? true : undefined}
        aria-expanded={open}
        role="combobox"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
        className={cn(
          'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900',
          'placeholder:text-gray-400 focus:outline-none focus:ring-2',
          'dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500',
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500/30 dark:border-red-500'
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/30 dark:border-gray-600 dark:focus:border-blue-400',
          disabled && 'cursor-not-allowed bg-gray-50 opacity-60 dark:bg-gray-800',
        )}
      />
      {open && (
        <ul
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          onMouseDown={(e) => e.preventDefault()}
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">
              {emptyText ?? 'Natija topilmadi'}
            </li>
          ) : (
            filtered.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => {
                    if (blurTimer.current) clearTimeout(blurTimer.current);
                    commit(o.value);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm',
                    'hover:bg-gray-50 dark:hover:bg-gray-700',
                    o.value === value
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                      : 'text-gray-900 dark:text-gray-200',
                  )}
                >
                  <span className="truncate">{o.label}</span>
                  {o.sublabel && (
                    <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                      {o.sublabel}
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
