import { Button } from '@/components/ui';
import { uz } from '@/i18n/uz';
import type { ExamineeSession } from '@/api/sessions';

interface TestIntroProps {
  session: ExamineeSession;
  onStart: () => void;
}

export function TestIntro({ session, onStart }: TestIntroProps) {
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
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{uz.test.introTitle}</h1>
        <p className="mt-1 text-sm text-gray-600">{session.assignmentTitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat
          label={uz.test.questionCount}
          value={uz.test.questionCountValue.replace('{count}', String(session.questions.length))}
        />
        <Stat
          label={uz.test.timeLimit}
          value={uz.test.minutesValue.replace('{count}', String(session.timeLimitMinutes))}
        />
        <Stat
          label={uz.test.passingScore}
          value={uz.test.percentValue.replace('{percent}', session.passingScorePercent)}
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

      <Button className="w-full" onClick={onStart}>
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
