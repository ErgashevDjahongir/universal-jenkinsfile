import { Card } from '@/components/ui';
import { uz } from '@/i18n/uz';

/** Bo'lim sarlavhasini ko'rsatadigan vaqtinchalik sahifa (mazmun keyin to'ldiriladi). */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      <Card>
        <p className="text-sm text-gray-400">{uz.common.comingSoon}</p>
      </Card>
    </div>
  );
}
