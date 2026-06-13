import { useEffect, useState } from 'react';
import { Check, Copy, Save, X } from 'lucide-react';
import { Button, Input, Modal, Select } from '@/components/ui';
import { uz } from '@/i18n/uz';
import {
  assignCandidate,
  updateCandidateAssignment,
  type CandidateAssignmentResult,
  type CandidateAssignmentView,
} from '@/api/candidates';
import { getTemplates, type TestTemplate } from '@/api/templates';

interface Props {
  open: boolean;
  onClose: () => void;
  candidateId: string;
  existing: CandidateAssignmentView | null;
  onSaved: (assignment: CandidateAssignmentView) => void;
}

function toLocalDatetime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AssignmentModal({ open, onClose, candidateId, existing, onSaved }: Props) {
  const [templates, setTemplates] = useState<TestTemplate[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CandidateAssignmentResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setCopied(false);
    setError(null);
    if (existing) {
      setTemplateId(existing.templateId);
      setTitle(existing.title);
      setStartsAt(toLocalDatetime(existing.startsAt));
      setEndsAt(toLocalDatetime(existing.endsAt));
    } else {
      setTemplateId('');
      setTitle('');
      setStartsAt('');
      setEndsAt('');
    }
    getTemplates({ status: 'active' })
      .then(setTemplates)
      .catch(() => setError(uz.common.error));
  }, [open, existing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!templateId || !title.trim() || !startsAt || !endsAt) {
      setError("Barcha maydonlar to'ldirilishi shart");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const dto = {
        templateId,
        title: title.trim(),
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      };
      if (existing) {
        const updated = await updateCandidateAssignment(candidateId, dto);
        onSaved(updated);
        onClose();
      } else {
        const res = await assignCandidate(candidateId, dto);
        setResult(res);
        onSaved(res.assignment);
      }
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

  function handleCopy() {
    if (!result) return;
    void navigator.clipboard.writeText(result.code.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (result) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title={uz.candidates.codeTitle}
        footer={
          <Button
            size="icon"
            title={uz.common.close}
            aria-label={uz.common.close}
            onClick={onClose}
          >
            <Check size={16} />
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">{uz.candidates.codeHint}</p>
          <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <span className="flex-1 font-mono text-xl font-bold tracking-widest text-blue-700">
              {result.code.code}
            </span>
            <Button
              variant="secondary"
              size="icon"
              title={copied ? uz.candidates.codeCopied : uz.candidates.codeCopy}
              aria-label={uz.candidates.codeCopy}
              onClick={handleCopy}
            >
              {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? uz.candidates.assignEdit : uz.candidates.assign}
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
            form="assignment-form"
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
      <form id="assignment-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <Select
          label={uz.candidates.templateLabel}
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          required
        >
          <option value="">{uz.candidates.selectTemplate}</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </Select>
        <Input
          label={uz.candidates.assignTitleLabel}
          placeholder={uz.candidates.assignTitlePlaceholder}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={uz.candidates.startsAtLabel}
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />
          <Input
            label={uz.candidates.endsAtLabel}
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            required
          />
        </div>
      </form>
    </Modal>
  );
}
