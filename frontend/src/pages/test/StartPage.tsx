import { Card } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { uz } from '@/i18n/uz';
import { CandidateCodeForm } from './CandidateCodeForm';

export function StartPage() {
  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo className="h-16 w-auto" />
      </div>

      <Card>
        <h2 className="text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
          {uz.test.entryTitle}
        </h2>
        <p className="mt-1 text-center text-sm text-gray-500 dark:text-gray-400">
          {uz.test.entrySubtitle}
        </p>
        <CandidateCodeForm />
      </Card>
    </div>
  );
}
