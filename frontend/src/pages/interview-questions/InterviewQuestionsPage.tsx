import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  deleteInterviewQuestion,
  getInterviewQuestions,
  type InterviewQuestion,
} from '@/api/interview-questions';
import { getSubjects, type Subject } from '@/api/subjects';
import { useAuth } from '@/auth/useAuth';
import { UserRole } from '@/auth/roles';
import { Button, DataState, Modal, PageHeader, Select } from '@/components/ui';
import { uz } from '@/i18n/uz';
import { InterviewQuestionFormModal } from './InterviewQuestionFormModal';

export function InterviewQuestionsPage() {
  const { user } = useAuth();
  const isReadOnly = user?.role === UserRole.EXPERT;

  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [subjectFilter, setSubjectFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InterviewQuestion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InterviewQuestion | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [qs, subs] = await Promise.all([getInterviewQuestions(), getSubjects()]);
      setQuestions(qs);
      setSubjects(subs);
    } catch {
      setError(uz.common.error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (subjectFilter && q.subjectId !== subjectFilter) return false;
      if (debouncedSearch && !q.questionText.toLowerCase().includes(debouncedSearch.toLowerCase()))
        return false;
      return true;
    });
  }, [questions, subjectFilter, debouncedSearch]);

  function subjectName(id: string) {
    return subjects.find((s) => s.id === id)?.name ?? id;
  }

  function openCreate() {
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(q: InterviewQuestion) {
    setEditTarget(q);
    setFormOpen(true);
  }

  function handleSaved(q: InterviewQuestion) {
    setQuestions((prev) => {
      const idx = prev.findIndex((x) => x.id === q.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = q;
        return next;
      }
      return [q, ...prev];
    });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError(null);
    try {
      await deleteInterviewQuestion(deleteTarget.id);
      setQuestions((prev) => prev.filter((q) => q.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setActionError(uz.common.error);
    } finally {
      setDeleting(false);
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={uz.interviewQuestions.title}
        actions={
          !isReadOnly && (
            <Button onClick={openCreate}>
              <Plus size={16} className="mr-1.5" />
              {uz.interviewQuestions.add}
            </Button>
          )
        }
      />

      {/* Filtrlar */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="w-full sm:w-56">
          <Select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            aria-label={uz.interviewQuestions.subjectLabel}
          >
            <option value="">{uz.interviewQuestions.allSubjects}</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <input
          type="search"
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          placeholder={uz.interviewQuestions.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={uz.common.search}
        />
      </div>

      {/* Ro'yxat */}
      <DataState
        loading={loading}
        error={error}
        onRetry={load}
        isEmpty={filtered.length === 0}
        emptyText={
          subjectFilter || debouncedSearch
            ? uz.interviewQuestions.emptyFiltered
            : uz.interviewQuestions.emptyText
        }
        emptyAction={
          !isReadOnly && !subjectFilter && !debouncedSearch ? (
            <Button onClick={openCreate}>
              <Plus size={16} className="mr-1.5" />
              {uz.interviewQuestions.add}
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-3">
          {filtered.map((q) => {
            const expanded = expandedId === q.id;
            return (
              <div key={q.id} className="rounded-lg border border-gray-200 bg-white">
                {/* Sarlavha qatori */}
                <button
                  type="button"
                  className="flex w-full items-start gap-3 p-4 text-left"
                  onClick={() => toggleExpand(q.id)}
                  aria-expanded={expanded}
                >
                  <span className="mt-0.5 flex-1 text-sm font-medium text-gray-900">
                    {q.questionText}
                  </span>
                  <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    {subjectName(q.subjectId)}
                  </span>
                  {expanded ? (
                    <ChevronUp size={16} className="mt-0.5 shrink-0 text-gray-400" />
                  ) : (
                    <ChevronDown size={16} className="mt-0.5 shrink-0 text-gray-400" />
                  )}
                </button>

                {/* Kengaytirilgan tafsilot */}
                {expanded && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        {uz.interviewQuestions.expectedAnswerLabel}
                      </p>
                      <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                        {q.expectedAnswer}
                      </p>
                    </div>
                    {q.rationale && (
                      <div>
                        <p className="text-xs font-medium text-gray-500">
                          {uz.interviewQuestions.rationaleLabel}
                        </p>
                        <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                          {q.rationale}
                        </p>
                      </div>
                    )}
                    {!isReadOnly && (
                      <div className="flex gap-2 pt-1">
                        <Button variant="secondary" size="sm" onClick={() => openEdit(q)}>
                          <Pencil size={14} className="mr-1" />
                          {uz.common.edit}
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => setDeleteTarget(q)}>
                          <Trash2 size={14} className="mr-1" />
                          {uz.interviewQuestions.delete}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DataState>

      {/* Forma modali (faqat admin) */}
      {!isReadOnly && (
        <InterviewQuestionFormModal
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSaved={handleSaved}
          initial={editTarget}
          subjects={subjects}
        />
      )}

      {/* O'chirish tasdiq modali */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={uz.interviewQuestions.delete}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {uz.common.cancel}
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              {uz.common.confirm}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700">{uz.interviewQuestions.deleteConfirm}</p>
        {deleteTarget && (
          <p className="mt-2 text-sm font-medium text-gray-900">{deleteTarget.questionText}</p>
        )}
        {actionError && <p className="mt-2 text-sm text-red-600">{actionError}</p>}
      </Modal>
    </div>
  );
}
