import { cn } from '@/lib/cn';

interface AvatarProps {
  /** To'liq ism "Familiya Ism ..." tartibida — bosh harflar shundan olinadi. */
  name: string;
  className?: string;
}

/** "Familiya Ism" dan ikki bosh harf (boshqa so'zlar e'tiborga olinmaydi). */
function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  return (first + second).toUpperCase();
}

/**
 * Ism bosh harflarini (Familiya + Ism) dumaloq fonda ko'rsatadi.
 * Bezak elementi — ism yonida matn sifatida ham bo'lgani uchun ekran o'quvchidan yashiriladi.
 */
export function Avatar({ name, className }: AvatarProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full bg-gray-200 text-xs font-semibold uppercase text-gray-600',
        'dark:bg-gray-700 dark:text-gray-300',
        className,
      )}
    >
      {initialsFromName(name)}
    </div>
  );
}
