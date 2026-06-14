import { Button } from '@/components/ui';
import { uz } from '@/i18n/uz';
import { useAuth } from '@/auth/useAuth';
import type { ExamineeSession } from '@/api/sessions';

interface TestIntroProps {
  session: ExamineeSession;
  onStart: () => void;
  /** "Testni boshlash" so'rovi serverga ketmoqda (taymer shu lahzada yoziladi). */
  starting?: boolean;
}

export function TestIntro({ session, onStart, starting = false }: TestIntroProps) {
  const { user } = useAuth();
  const fullName = user ? `${user.lastName} ${user.firstName}`.trim() : null;

  const rules: string[] = [
    uz.test.ruleTimer,
    uz.test.ruleAutosave,
    uz.test.ruleTabSwitch.replace('{count}', String(session.maxTabSwitches)),
    session.navigation === 'forward_only'
      ? uz.test.ruleNavigationForward
      : uz.test.ruleNavigationFree,
  ];

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-center text-2xl font-semibold text-gray-900">{uz.test.introTitle}</h1>

      {fullName && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-center">
          <p className="text-xs text-blue-600">{uz.test.examineeLabel}</p>
          <p className="mt-0.5 text-base font-medium text-blue-900">{fullName}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat
          label={uz.test.questionCount}
          value={uz.test.questionCountValue.replace('{count}', String(session.questionCount))}
        />
        <Stat
          label={uz.test.timeLimit}
          value={uz.test.minutesValue.replace('{count}', String(session.timeLimitMinutes))}
        />
        <Stat
          label={uz.test.passingScore}
          value={parseFloat(session.passingScorePercent).toFixed(0)}
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-medium text-gray-900">{uz.test.rulesTitle}</h2>
        <ul className="mt-3 space-y-2">
          {rules.map((rule) => (
            <li key={rule} className="flex gap-2 text-sm text-gray-700">
              <span className="mt-0.5 text-blue-600" aria-hidden="true">
                •
              </span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </div>

      <Button className="w-full" onClick={onStart} loading={starting} disabled={starting}>
        {uz.test.start}
      </Button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-gray-900">{value}</p>
    </div>
  );
}
