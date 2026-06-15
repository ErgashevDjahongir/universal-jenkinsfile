import { uz } from '@/i18n/uz';
import { cn } from '@/lib/cn';
import type { AnswerPayload, ExamineeQuestion, NavigationMode } from '@/api/sessions';
import { isAnswered } from '../answer';

interface QuestionNavProps {
  questions: ExamineeQuestion[];
  answers: Record<string, AnswerPayload>;
  flagged: Set<string>;
  currentIndex: number;
  navigation: NavigationMode;
  onSelect: (index: number) => void;
}

export function QuestionNav({
  questions,
  answers,
  flagged,
  currentIndex,
  navigation,
  onSelect,
}: QuestionNavProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{uz.test.navTitle}</h3>
      <div className="grid grid-cols-10 gap-1 sm:grid-cols-12 lg:grid-cols-12">
        {questions.map((q, i) => {
          const answered = isAnswered(q, answers[q.sessionQuestionId]);
          const isFlagged = flagged.has(q.sessionQuestionId);
          const isCurrent = i === currentIndex;
          const locked = navigation === 'forward_only' && i < currentIndex;
          return (
            <button
              key={q.sessionQuestionId}
              type="button"
              disabled={locked}
              onClick={() => onSelect(i)}
              aria-current={isCurrent ? 'true' : undefined}
              className={cn(
                'relative flex h-8 items-center justify-center rounded text-xs font-medium transition-colors',
                answered
                  ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-400 dark:hover:bg-green-900/60'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600',
                isCurrent && 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-800',
                locked && 'cursor-not-allowed opacity-50',
              )}
            >
              {i + 1}
              {isFlagged && (
                <span
                  className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-yellow-400"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 pt-1 text-xs text-gray-600 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-green-100 ring-1 ring-green-300 dark:bg-green-900/40 dark:ring-green-700" />
          {uz.test.legendAnswered}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-gray-100 ring-1 ring-gray-300 dark:bg-gray-700 dark:ring-gray-600" />
          {uz.test.legendUnanswered}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="relative h-3 w-3 rounded bg-gray-100 ring-1 ring-gray-300 dark:bg-gray-700 dark:ring-gray-600">
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-yellow-400" />
          </span>
          {uz.test.legendFlagged}
        </span>
      </div>
    </div>
  );
}
