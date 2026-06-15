import { Select, SafeHtml } from '@/components/ui';
import { uz } from '@/i18n/uz';
import { cn } from '@/lib/cn';
import type { AnswerPayload, ExamineeQuestion } from '@/api/sessions';

interface QuestionViewProps {
  question: ExamineeQuestion;
  index: number;
  total: number;
  value: AnswerPayload;
  onChange: (next: AnswerPayload) => void;
}

const HINTS: Partial<Record<ExamineeQuestion['type'], string>> = {
  single_choice: uz.test.hintSingle,
  true_false: uz.test.hintSingle,
  multiple_choice: uz.test.hintMultiple,
  ordering: uz.test.hintOrdering,
  matching: uz.test.hintMatching,
};

export function QuestionView({ question, index, total, value, onChange }: QuestionViewProps) {
  const hint = HINTS[question.type];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium text-gray-500">
          {uz.test.questionLabel
            .replace('{current}', String(index + 1))
            .replace('{total}', String(total))}
        </span>
        <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
          {uz.test.pointsValue.replace('{points}', question.points)}
        </span>
      </div>

      <SafeHtml html={question.text} className="rte-display text-base font-medium text-gray-900" />
      {hint && <p className="text-xs text-gray-500">{hint}</p>}

      <div className="pt-1">
        {(question.type === 'single_choice' || question.type === 'true_false') && (
          <ChoiceList question={question} value={value} onChange={onChange} multiple={false} />
        )}
        {question.type === 'multiple_choice' && (
          <ChoiceList question={question} value={value} onChange={onChange} multiple />
        )}
        {question.type === 'ordering' && (
          <OrderingList question={question} value={value} onChange={onChange} />
        )}
        {question.type === 'matching' && (
          <MatchingList question={question} value={value} onChange={onChange} />
        )}
        {question.type === 'short_answer' && <ShortAnswer value={value} onChange={onChange} />}
      </div>
    </div>
  );
}

/** single / true_false (radio) yoki multiple (checkbox). */
function ChoiceList({
  question,
  value,
  onChange,
  multiple,
}: {
  question: ExamineeQuestion;
  value: AnswerPayload;
  onChange: (next: AnswerPayload) => void;
  multiple: boolean;
}) {
  const selected = value.selectedOptionIds ?? [];

  function toggle(id: string): void {
    if (multiple) {
      const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
      onChange({ selectedOptionIds: next });
    } else {
      onChange({ selectedOptionIds: [id] });
    }
  }

  return (
    <div className="space-y-2">
      {question.options.map((o) => {
        const checked = selected.includes(o.id);
        return (
          <label
            key={o.id}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
              checked ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50',
            )}
          >
            <input
              type={multiple ? 'checkbox' : 'radio'}
              name={`q-${question.sessionQuestionId}`}
              checked={checked}
              onChange={() => toggle(o.id)}
              className="h-4 w-4 shrink-0 accent-blue-600"
            />
            <span className="text-sm text-gray-900">{o.text}</span>
          </label>
        );
      })}
    </div>
  );
}

/** ordering — yuqori/past tugmalari bilan tartiblash (telefonda qulay). */
function OrderingList({
  question,
  value,
  onChange,
}: {
  question: ExamineeQuestion;
  value: AnswerPayload;
  onChange: (next: AnswerPayload) => void;
}) {
  const ids = question.options.map((o) => o.id);
  const stored = value.selectedOptionIds ?? [];
  // Saqlangan tartib to'liq va haqiqiy bo'lsa undan, aks holda berilgan tartibdan.
  const order =
    stored.length === ids.length && stored.every((id) => ids.includes(id)) ? stored : ids;
  const textById = new Map(question.options.map((o) => [o.id, o.text]));

  function move(from: number, to: number): void {
    if (to < 0 || to >= order.length) {
      return;
    }
    const next = [...order];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange({ selectedOptionIds: next });
  }

  return (
    <ol className="space-y-2">
      {order.map((id, i) => (
        <li
          key={id}
          className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
            {i + 1}
          </span>
          <span className="flex-1 text-sm text-gray-900">{textById.get(id)}</span>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              aria-label={uz.test.moveUp}
              disabled={i === 0}
              onClick={() => move(i, i - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={uz.test.moveDown}
              disabled={i === order.length - 1}
              onClick={() => move(i, i + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
            >
              ↓
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** matching — chap band uchun o'ng qiymatni tanlash. */
function MatchingList({
  question,
  value,
  onChange,
}: {
  question: ExamineeQuestion;
  value: AnswerPayload;
  onChange: (next: AnswerPayload) => void;
}) {
  const pairs = value.matchPairs ?? [];
  const valueFor = (optionId: string): string =>
    pairs.find((p) => p.optionId === optionId)?.value ?? '';

  function setPair(optionId: string, val: string): void {
    const rest = pairs.filter((p) => p.optionId !== optionId);
    const next = val ? [...rest, { optionId, value: val }] : rest;
    onChange({ matchPairs: next });
  }

  return (
    <div className="space-y-3">
      {question.options.map((o) => (
        <div key={o.id} className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:items-center">
          <span className="text-sm text-gray-900">{o.text}</span>
          <Select value={valueFor(o.id)} onChange={(e) => setPair(o.id, e.target.value)}>
            <option value="">{uz.test.matchSelectPlaceholder}</option>
            {(question.matchOptions ?? []).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </div>
      ))}
    </div>
  );
}

/** short_answer — erkin matn. */
function ShortAnswer({
  value,
  onChange,
}: {
  value: AnswerPayload;
  onChange: (next: AnswerPayload) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor="short-answer" className="block text-sm font-medium text-gray-700">
        {uz.test.shortAnswerLabel}
      </label>
      <input
        id="short-answer"
        type="text"
        value={value.answerText ?? ''}
        onChange={(e) => onChange({ answerText: e.target.value })}
        placeholder={uz.test.shortAnswerPlaceholder}
        autoComplete="off"
        className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      />
    </div>
  );
}
