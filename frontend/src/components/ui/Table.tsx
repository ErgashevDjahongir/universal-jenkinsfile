import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { DataState } from './DataState';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string | null;
  emptyText?: string;
  onRetry?: () => void;
}

/** 4 holat asosini (loading/xato/bo'sh/data) ichiga olgan umumiy jadval. */
export function Table<T>({
  columns,
  data,
  rowKey,
  loading = false,
  error,
  emptyText,
  onRetry,
}: TableProps<T>) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <DataState
        loading={loading}
        error={error}
        isEmpty={data.length === 0}
        emptyText={emptyText}
        onRetry={onRetry}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn('px-4 py-3 text-left font-medium text-gray-500', col.className)}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row) => (
                <tr key={rowKey(row)} className="hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-4 py-3 text-gray-700', col.className)}>
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>
    </div>
  );
}
