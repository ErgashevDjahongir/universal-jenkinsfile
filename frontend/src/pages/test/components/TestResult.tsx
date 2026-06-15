import { Button } from '@/components/ui';
import { uz } from '@/i18n/uz';
import { cn } from '@/lib/cn';
import type { SessionResult } from '@/api/sessions';

interface TestResultProps {
  result: SessionResult;
  onExit: () => void;
}

export function TestResult({ result, onExit }: TestResultProps) {
  const hidden = result.resultVisibility === 'hidden' || result.score === null;
  const passed = result.passed === true;

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {uz.test.resultTitle}
        </h1>
        {result.status === 'expired' && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{uz.test.resultTimeUp}</p>
        )}
        {result.status === 'terminated' && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{uz.test.resultTerminated}</p>
        )}
      </div>

      {hidden ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-700 dark:text-gray-300">{uz.test.resultHidden}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div
            className={cn(
              'rounded-lg border p-5',
              passed
                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/30'
                : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/30',
            )}
          >
            <p
              className={cn(
                'text-base font-semibold',
                passed ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400',
              )}
            >
              {passed ? uz.test.resultPassed : uz.test.resultFailed}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Stat label={uz.test.resultScore} value={`${result.score}/${result.maxScore}`} />
            <Stat
              label={uz.test.resultPercent}
              value={uz.test.percentValue.replace('{percent}', result.percent ?? '—')}
            />
            <Stat
              label={uz.test.resultCorrectCount}
              value={
                result.correctCount != null && result.totalCount != null
                  ? uz.test.correctCountValue
                      .replace('{correct}', String(result.correctCount))
                      .replace('{total}', String(result.totalCount))
                  : '—'
              }
            />
          </div>

          {result.certificateUid && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {uz.test.certificateUid.replace('{uid}', result.certificateUid)}
            </p>
          )}
        </div>
      )}

      <Button variant="secondary" className="w-full" onClick={onExit}>
        {uz.test.exit}
      </Button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}
