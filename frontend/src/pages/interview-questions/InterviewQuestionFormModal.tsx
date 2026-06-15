import { useState } from 'react';
import { Save, X } from 'lucide-react';
import {
  createInterviewQuestion,
  updateInterviewQuestion,
  type InterviewQuestion,
} from '@/api/interview-questions';
import { type Subject } from '@/api/subjects';
import { Button, Modal, Select, RichTextEditor } from '@/components/ui';
import { sanitizeHtml, isHtmlEmpty } from '@/lib/sanitize';
import { uz } from '@/i18n/uz';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (q: InterviewQuestion) => void;
  initial: InterviewQuestion | null;
  subjects: Subject[];
}

export function InterviewQuestionFormModal({ open, onClose, onSaved, initial, subjects }: Props) {
  const [subjectId, setSubjectId] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [expectedAnswer, setExpectedAnswer] = useState('');
  const [rationale, setRationale] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Render vaqtida state yangilash (useEffect o'rniga) — shunda RichTextEditor
  // to'g'ri initial value bilan mount bo'ladi, keyinroq setContent kerak bo'lmaydi.
  const [seenKey, setSeenKey] = useState('');
  const currentKey = open ? (initial?.id ?? 'new') : '';
  if (currentKey !== seenKey) {
    setSeenKey(currentKey);
    if (open) {
      setSubjectId(initial?.subjectId ?? '');
      setQuestionText(initial?.questionText ?? '');
      setExpectedAnswer(initial?.expectedAnswer ?? '');
      setRationale(initial?.rationale ?? '');
      setError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectId || isHtmlEmpty(questionText) || isHtmlEmpty(expectedAnswer)) {
      setError(
        `${uz.interviewQuestions.subjectLabel}, ${uz.interviewQuestions.questionTextLabel} va ${uz.interviewQuestions.expectedAnswerLabel} majburiy`,
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        subjectId,
        questionText: sanitizeHtml(questionText),
        expectedAnswer: sanitizeHtml(expectedAnswer),
        rationale: isHtmlEmpty(rationale) ? undefined : sanitizeHtml(rationale),
      };
      const result = initial
        ? await updateInterviewQuestion(initial.id, payload)
        : await createInterviewQuestion(payload);
      onSaved(result);
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ??
            err.message)
          : uz.common.error;
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? uz.interviewQuestions.edit : uz.interviewQuestions.add}
      size="xl"
      footer={
        <>
          <Button
            variant="secondary"
            size="icon"
            title={uz.common.cancel}
            aria-label={uz.common.cancel}
            onClick={onClose}
            disabled={saving}
          >
            <X size={16} />
          </Button>
          <Button
            type="submit"
            form="interview-question-form"
            size="icon"
            title={uz.common.save}
            aria-label={uz.common.save}
            loading={saving}
          >
            <Save size={16} />
          </Button>
        </>
      }
    >
      <form id="interview-question-form" onSubmit={handleSubmit} className="space-y-4">
        <Select
          label={uz.interviewQuestions.subjectLabel}
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          required
        >
          <option value="">{uz.interviewQuestions.allSubjects}</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">
            {uz.interviewQuestions.questionTextLabel}
          </label>
          <RichTextEditor
            value={questionText}
            onChange={setQuestionText}
            placeholder={uz.interviewQuestions.questionTextPlaceholder}
            minRows={3}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">
            {uz.interviewQuestions.expectedAnswerLabel}
          </label>
          <RichTextEditor
            value={expectedAnswer}
            onChange={setExpectedAnswer}
            placeholder={uz.interviewQuestions.expectedAnswerPlaceholder}
            minRows={4}
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">
            {uz.interviewQuestions.rationaleLabel}
          </label>
          <RichTextEditor
            value={rationale}
            onChange={setRationale}
            placeholder={uz.interviewQuestions.rationalePlaceholder}
            minRows={3}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
