import { Card, PageHeader } from '@/components/ui';
import { uz } from '@/i18n/uz';

/** Bo'lim sarlavhasini ko'rsatadigan vaqtinchalik sahifa (mazmun keyin to'ldiriladi). */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <PageHeader title={title} />
      <Card>
        <p className="text-sm text-gray-400">{uz.common.comingSoon}</p>
      </Card>
    </div>
  );
}
