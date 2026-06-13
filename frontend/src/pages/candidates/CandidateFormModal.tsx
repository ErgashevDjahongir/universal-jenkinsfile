import { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';
import { Button, Input, Modal } from '@/components/ui';
import { uz } from '@/i18n/uz';
import {
  createCandidate,
  updateCandidate,
  type CandidateDetail,
  type CandidateListRow,
} from '@/api/candidates';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (candidate: CandidateDetail) => void;
  initial: CandidateListRow | CandidateDetail | null;
}

export function CandidateFormModal({ open, onClose, onSaved, initial }: Props) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFullName(initial?.fullName ?? '');
    setPhone(initial?.phone ?? '');
    setError(null);
  }, [open, initial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      setError('F.I.Sh. va telefon majburiy');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = initial
        ? await updateCandidate(initial.id, { fullName: fullName.trim(), phone: phone.trim() })
        : await createCandidate({ fullName: fullName.trim(), phone: phone.trim() });
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
      title={initial ? uz.candidates.edit : uz.candidates.add}
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
            form="candidate-form"
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
      <form id="candidate-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <Input
          label={uz.candidates.fullNameLabel}
          placeholder={uz.candidates.fullNamePlaceholder}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <Input
          label={uz.candidates.phoneLabel}
          placeholder={uz.candidates.phonePlaceholder}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </form>
    </Modal>
  );
}
