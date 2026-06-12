import { useState, useEffect, useCallback } from 'react';
import { Button, Badge, Input, Select, Table, Modal, type Column } from '@/components/ui';
import { uz } from '@/i18n/uz';
import {
  getAssignments,
  createAssignment,
  deleteAssignment,
  generateCodes,
  listCodes,
  type TestAssignment,
  type AccessCode,
  type AssignmentTargetDto,
} from '@/api/assignments';
import { getTemplates, type TestTemplate } from '@/api/templates';

// ---- tayinlov yaratish modali ----
interface CreateModalProps {
  open: boolean;
  templates: TestTemplate[];
  onCreated: (a: TestAssignment) => void;
  onClose: () => void;
}

function CreateAssignmentModal({ open, templates, onCreated, onClose }: CreateModalProps) {
  const [templateId, setTemplateId] = useState('');
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [targets, setTargets] = useState<{ type: 'user' | 'group'; value: string }[]>([
    { type: 'user', value: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTemplateId('');
      setTitle('');
      setStartsAt('');
      setEndsAt('');
      setTargets([{ type: 'user', value: '' }]);
      setError(null);
    }
  }, [open]);

  function addTarget() {
    setTargets((prev) => [...prev, { type: 'user', value: '' }]);
  }
  function updateTarget(i: number, patch: Partial<{ type: 'user' | 'group'; value: string }>) {
    setTargets((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  }
  function removeTarget(i: number) {
    setTargets((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    setError(null);
    const validTargets = targets.filter((t) => t.value.trim());
    if (!templateId || !title.trim() || !startsAt || !endsAt || validTargets.length === 0) {
      setError("Barcha majburiy maydonlarni to'ldiring va kamida bitta maqsad kiriting");
      return;
    }
    const targetDtos: AssignmentTargetDto[] = validTargets.map((t) =>
      t.type === 'user' ? { userId: t.value.trim() } : { groupId: t.value.trim() },
    );
    setSaving(true);
    try {
      const a = await createAssignment({
        templateId,
        title: title.trim(),
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        targets: targetDtos,
      });
      onCreated(a);
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
      title={uz.assignments.add}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {uz.common.cancel}
          </Button>
          <Button size="sm" loading={saving} onClick={handleSave}>
            {saving ? uz.assignments.saving : uz.common.save}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <Select
          label={uz.assignments.templateLabel}
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
        >
          <option value="">{uz.assignments.selectTemplate}</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </Select>

        <Input
          label={uz.assignments.titleLabel}
          placeholder={uz.assignments.titlePlaceholder}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={uz.assignments.startsAtLabel}
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
          <Input
            label={uz.assignments.endsAtLabel}
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              {uz.assignments.targetsTitle}
            </label>
            <button
              type="button"
              onClick={addTarget}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {uz.assignments.targetAdd}
            </button>
          </div>
          <div className="space-y-2">
            {targets.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select
                  value={t.type}
                  onChange={(e) => updateTarget(i, { type: e.target.value as 'user' | 'group' })}
                >
                  <option value="user">Foydalanuvchi</option>
                  <option value="group">Guruh</option>
                </Select>
                <Input
                  placeholder={
                    t.type === 'user'
                      ? uz.assignments.targetUserPlaceholder
                      : uz.assignments.targetGroupPlaceholder
                  }
                  value={t.value}
                  onChange={(e) => updateTarget(i, { value: e.target.value })}
                />
                {targets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTarget(i)}
                    className="text-sm text-red-500 hover:text-red-700 shrink-0"
                    aria-label="O'chirish"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ---- kirish kodlari modali ----
interface CodesModalProps {
  assignment: TestAssignment | null;
  onClose: () => void;
}

function CodesModal({ assignment, onClose }: CodesModalProps) {
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [genMode, setGenMode] = useState<'perUser' | 'count'>('perUser');
  const [count, setCount] = useState('10');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    if (!assignment) return;
    setLoading(true);
    listCodes(assignment.id)
      .then(setCodes)
      .catch(() => setCodes([]))
      .finally(() => setLoading(false));
  }, [assignment]);

  async function handleGenerate() {
    if (!assignment) return;
    setGenError(null);
    setGenerating(true);
    try {
      const dto = genMode === 'perUser' ? { perUser: true } : { count: Number(count) };
      const newCodes = await generateCodes(assignment.id, dto);
      setCodes((prev) => [...prev, ...newCodes]);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ??
            err.message)
          : uz.common.error;
      setGenError(msg);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Modal
      open={!!assignment}
      onClose={onClose}
      title={`${uz.assignments.codesTitle}: ${assignment?.title ?? ''}`}
      className="max-w-2xl"
      footer={
        <Button variant="secondary" size="sm" onClick={onClose}>
          {uz.common.close}
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Generatsiya formasi */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">{uz.assignments.generateCodes}</p>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="radio"
                checked={genMode === 'perUser'}
                onChange={() => setGenMode('perUser')}
                className="text-blue-600"
              />
              {uz.assignments.generatePerUser}
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="radio"
                checked={genMode === 'count'}
                onChange={() => setGenMode('count')}
                className="text-blue-600"
              />
              {uz.assignments.generateCount}
            </label>
            {genMode === 'count' && (
              <div className="w-24">
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  placeholder={uz.assignments.generateCountPlaceholder}
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                />
              </div>
            )}
          </div>
          {genError && <p className="text-sm text-red-600">{genError}</p>}
          <Button size="sm" loading={generating} onClick={handleGenerate}>
            {generating ? uz.assignments.generating : uz.assignments.generateCodes}
          </Button>
        </div>

        {/* Kodlar ro'yxati */}
        {loading ? (
          <p className="text-sm text-gray-500">{uz.common.loading}</p>
        ) : codes.length === 0 ? (
          <p className="text-sm text-gray-400">{uz.assignments.codesEmpty}</p>
        ) : (
          <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Kod</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                    Foydalanuvchi
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Holat</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-mono text-gray-900">{c.code}</td>
                    <td className="px-3 py-2 text-gray-600">{c.userId ?? '—'}</td>
                    <td className="px-3 py-2">
                      <Badge variant={c.usedAt ? 'neutral' : 'success'}>
                        {c.usedAt ? uz.assignments.codeUsed : uz.assignments.codeUnused}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ---- asosiy sahifa ----
function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AssignmentsPage() {
  const [assignments, setAssignments] = useState<TestAssignment[]>([]);
  const [activeTemplates, setActiveTemplates] = useState<TestTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [codesTarget, setCodesTarget] = useState<TestAssignment | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [asgn, tmpls] = await Promise.all([
        getAssignments(),
        getTemplates({ status: 'active' }),
      ]);
      setAssignments(asgn);
      setActiveTemplates(tmpls);
    } catch {
      setError(uz.common.error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(a: TestAssignment) {
    if (!window.confirm(uz.assignments.deleteConfirm)) return;
    setDeleteError(null);
    try {
      await deleteAssignment(a.id);
      setAssignments((prev) => prev.filter((x) => x.id !== a.id));
    } catch {
      setDeleteError(uz.assignments.deleteError);
    }
  }

  const columns: Column<TestAssignment>[] = [
    {
      key: 'title',
      header: uz.assignments.titleLabel,
      render: (a) => <span className="text-sm font-medium text-gray-900">{a.title}</span>,
    },
    {
      key: 'template',
      header: uz.assignments.templateLabel,
      render: (a) => (
        <span className="text-xs text-gray-600">{a.template?.title ?? `#${a.templateId}`}</span>
      ),
    },
    {
      key: 'startsAt',
      header: uz.assignments.startsAtLabel,
      render: (a) => (
        <span className="text-xs text-gray-600 whitespace-nowrap">{formatDate(a.startsAt)}</span>
      ),
    },
    {
      key: 'endsAt',
      header: uz.assignments.endsAtLabel,
      render: (a) => (
        <span className="text-xs text-gray-600 whitespace-nowrap">{formatDate(a.endsAt)}</span>
      ),
    },
    {
      key: 'targets',
      header: 'Maqsadlar',
      render: (a) => (
        <span className="text-xs text-gray-500">
          {uz.assignments.targets.replace('{count}', String(a.targets?.length ?? 0))}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-36',
      render: (a) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setCodesTarget(a)}>
            {uz.assignments.viewCodes}
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(a)}>
            {uz.assignments.delete}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{uz.assignments.title}</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          {uz.assignments.add}
        </Button>
      </div>

      {deleteError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {deleteError}
        </div>
      )}

      <Table
        columns={columns}
        data={assignments}
        rowKey={(a) => a.id}
        loading={loading}
        error={error}
        emptyText={uz.assignments.emptyText}
        onRetry={load}
      />

      <CreateAssignmentModal
        open={createOpen}
        templates={activeTemplates}
        onCreated={(a) => {
          setAssignments((prev) => [a, ...prev]);
          setCreateOpen(false);
        }}
        onClose={() => setCreateOpen(false)}
      />

      <CodesModal assignment={codesTarget} onClose={() => setCodesTarget(null)} />
    </div>
  );
}
