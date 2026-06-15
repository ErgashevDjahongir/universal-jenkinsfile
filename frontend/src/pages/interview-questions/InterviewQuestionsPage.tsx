import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  deleteInterviewQuestion,
  getInterviewQuestions,
  type InterviewQuestion,
} from '@/api/interview-questions';
import { getSubjects, type Subject } from '@/api/subjects';
import { useAuth } from '@/auth/useAuth';
import { UserRole } from '@/auth/roles';
import { Button, DataState, Modal, PageHeader, Select, SafeHtml } from '@/components/ui';
import { uz } from '@/i18n/uz';
import { InterviewQuestionFormModal } from './InterviewQuestionFormModal';

/** Bir yo'nalish uchun savollar guruhi. */
interface SubjectGroup {
  subject: Subject;
  questions: InterviewQuestion[];
}

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

  // Ochiq accordion'lar to'plami (subject ID'lar); boshlang'ichda hammasi ochiq.
  const initializedRef = useRef(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
      // Birinchi yuklanishda barcha guruhlarni ochiq qilamiz.
      if (!initializedRef.current) {
        initializedRef.current = true;
        const ids = new Set(qs.map((q) => q.subjectId));
        setOpenGroups(ids);
      }
    } catch {
      setError(uz.common.error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Filtrlanib, yo'nalish bo'yicha guruhlangan savollar. */
  const groups = useMemo<SubjectGroup[]>(() => {
    const filtered = questions.filter((q) => {
      if (subjectFilter && q.subjectId !== subjectFilter) return false;
      if (debouncedSearch && !q.questionText.toLowerCase().includes(debouncedSearch.toLowerCase()))
        return false;
      return true;
    });

    // Yo'nalish tartibini subjects ro'yxati tartibiga moslashtiramiz.
    const subjectMap = new Map(subjects.map((s) => [s.id, s]));
    const groupMap = new Map<string, InterviewQuestion[]>();
    for (const q of filtered) {
      const arr = groupMap.get(q.subjectId) ?? [];
      arr.push(q);
      groupMap.set(q.subjectId, arr);
    }

    return [...groupMap.entries()]
      .map(([subjectId, qs]) => ({
        subject: subjectMap.get(subjectId) ?? ({ id: subjectId, name: subjectId } as Subject),
        questions: qs,
      }))
      .sort((a, b) => Number(a.subject.id) - Number(b.subject.id));
  }, [questions, subjects, subjectFilter, debouncedSearch]);

  const totalFiltered = groups.reduce((acc, g) => acc + g.questions.length, 0);

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
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400"
          placeholder={uz.interviewQuestions.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={uz.common.search}
        />
      </div>

      {/* Asosiy kontent */}
      <DataState
        loading={loading}
        error={error}
        onRetry={load}
        isEmpty={totalFiltered === 0}
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
        <div className="space-y-4">
          {groups.map(({ subject, questions: qs }) => {
            const isOpen = openGroups.has(subject.id);
            return (
              <section
                key={subject.id}
                className="rounded-lg border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700"
              >
                {/* Accordion sarlavha */}
                <button
                  type="button"
                  onClick={() => toggleGroup(subject.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between px-5 py-4 text-left"
                >
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {subject.name}
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {uz.interviewQuestions.questionCount.replace('{count}', String(qs.length))}
                    </span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400">
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </span>
                  </div>
                </button>

                {/* Jadval */}
                {isOpen && (
                  <div className="border-t border-gray-100 overflow-x-auto dark:border-gray-700">
                    <table className="w-full table-fixed divide-y divide-gray-200 bg-white text-sm dark:bg-gray-800 dark:divide-gray-700">
                      <colgroup>
                        <col className="w-10" />
                        <col className={isReadOnly ? 'w-1/3' : 'w-[30%]'} />
                        <col className={isReadOnly ? 'w-1/3' : 'w-[30%]'} />
                        <col className={isReadOnly ? 'w-1/3' : 'w-[25%]'} />
                        {!isReadOnly && <col className="w-20" />}
                      </colgroup>
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900">
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            №
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {uz.interviewQuestions.colQuestion}
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Javob
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {uz.interviewQuestions.colRationale}
                          </th>
                          {!isReadOnly && (
                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                              {uz.interviewQuestions.colActions}
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {qs.map((q, idx) => (
                          <tr
                            key={q.id}
                            className="align-top hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          >
                            <td className="px-4 py-3 text-gray-400 dark:text-gray-500">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                              <SafeHtml html={q.questionText} className="rte-display" />
                            </td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                              <SafeHtml html={q.expectedAnswer} className="rte-display" />
                            </td>
                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                              {q.rationale ? (
                                <SafeHtml html={q.rationale} className="rte-display" />
                              ) : (
                                <span className="text-gray-300 dark:text-gray-600">—</span>
                              )}
                            </td>
                            {!isReadOnly && (
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openEdit(q)}
                                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                                    aria-label={uz.common.edit}
                                    title={uz.common.edit}
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTarget(q)}
                                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                                    aria-label={uz.interviewQuestions.delete}
                                    title={uz.interviewQuestions.delete}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
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
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {uz.interviewQuestions.deleteConfirm}
        </p>
        {deleteTarget && (
          <p className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            {deleteTarget.questionText}
          </p>
        )}
        {actionError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{actionError}</p>
        )}
      </Modal>
    </div>
  );
}
