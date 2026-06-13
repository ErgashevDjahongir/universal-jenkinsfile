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
        <h1 className="text-2xl font-semibold text-gray-900">{uz.test.resultTitle}</h1>
        {result.status === 'expired' && (
          <p className="mt-2 text-sm text-gray-500">{uz.test.resultTimeUp}</p>
        )}
        {result.status === 'terminated' && (
          <p className="mt-2 text-sm text-red-600">{uz.test.resultTerminated}</p>
        )}
      </div>

      {hidden ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-700">{uz.test.resultHidden}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div
            className={cn(
              'rounded-lg border p-5',
              passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50',
            )}
          >
            <p
              className={cn('text-base font-semibold', passed ? 'text-green-700' : 'text-red-700')}
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
            <p className="text-xs text-gray-500">
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
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}
