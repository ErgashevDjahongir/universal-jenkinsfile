import { Card } from '@/components/ui';
import { uz } from '@/i18n/uz';

export function TestHomePage() {
  return (
    <Card>
      <h1 className="text-xl font-semibold text-slate-900">{uz.test.home}</h1>
      <p className="mt-1 text-sm text-slate-400">{uz.common.comingSoon}</p>
    </Card>
  );
}
