import { Button } from './Button';
import { uz } from '@/i18n/uz';

interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onChange: (page: number) => void;
}

/** Sahifalash boshqaruvi: yozuvlar oralig'i + oldingi/keyingi tugmalar. */
export function Pagination({ page, total, limit, onChange }: PaginationProps) {
  if (total === 0 || limit <= 0) return null;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const from = (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {uz.common.paginationInfo
          .replace('{from}', String(from))
          .replace('{to}', String(to))
          .replace('{total}', String(total))}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          {uz.common.prev}
        </Button>
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {page} / {pageCount}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
        >
          {uz.common.next}
        </Button>
      </div>
    </div>
  );
}
