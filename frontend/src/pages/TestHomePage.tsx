import { Card } from '@/components/ui';
import { uz } from '@/i18n/uz';

export function TestHomePage() {
  return (
    <Card>
      <h1 className="text-xl font-semibold text-gray-900">{uz.test.home}</h1>
      <p className="mt-1 text-sm text-gray-400">{uz.common.comingSoon}</p>
    </Card>
  );
}
