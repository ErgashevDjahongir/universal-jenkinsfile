import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Button,
  Modal,
  PageHeader,
  Pagination,
  Select,
  Table,
  type Column,
} from '@/components/ui';
import { uz } from '@/i18n/uz';
import { useAuth } from '@/auth/useAuth';
import { UserRole } from '@/auth/roles';
import {
  deleteCandidate,
  getCandidates,
  type CandidateListRow,
  type CandidateStatus,
  type CandidateView,
} from '@/api/candidates';
import { CandidateFormModal } from './CandidateFormModal';

const STATUS_BADGE: Record<CandidateStatus, 'warning' | 'info' | 'success' | 'neutral'> = {
  pending: 'warning',
  in_progress: 'info',
  completed: 'success',
  no_show: 'neutral',
};

const STATUS_LABEL: Record<CandidateStatus, string> = {
  pending: uz.candidates.statusPending,
  in_progress: uz.candidates.statusInProgress,
  completed: uz.candidates.statusCompleted,
  no_show: uz.candidates.statusNoShow,
};

const PAGE_LIMIT = 20;

export function CandidatesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isReadOnly = user?.role === UserRole.EXPERT;
  const [candidates, setCandidates] = useState<CandidateListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<CandidateView>('current');
  const [statusFilter, setStatusFilter] = useState<CandidateStatus | ''>('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CandidateListRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CandidateListRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCandidates({ view });
      setCandidates(data);
      setPage(1);
    } catch {
      setError(uz.common.error);
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (debouncedSearch && !c.fullName.toLowerCase().includes(debouncedSearch.toLowerCase()))
        return false;
      return true;
    });
  }, [candidates, statusFilter, debouncedSearch]);

  const todayCandidates = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    return candidates.filter((c) => {
      if (!c.assignment) return false;
      const s = new Date(c.assignment.startsAt);
      const e = new Date(c.assignment.endsAt);
      return s <= todayEnd && e >= todayStart;
    });
  }, [candidates]);

  const paged = filtered.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT);

  function changeView(next: CandidateView) {
    if (next === view) return;
    setView(next);
    setStatusFilter('');
    setPage(1);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError(null);
    try {
      await deleteCandidate(deleteTarget.id);
      setCandidates((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setActionError(uz.common.error);
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<CandidateListRow>[] = [
    {
      key: 'fullName',
      header: uz.candidates.fullNameLabel,
      render: (c) => (
        <div className="flex items-center gap-3">
          <Avatar name={c.fullName} />
          <div className="font-medium text-gray-900 dark:text-gray-100">{c.fullName}</div>
        </div>
      ),
    },
    {
      key: 'assignment',
      header: uz.candidates.assignmentTitle,
      render: (c) =>
        c.assignment ? (
          <div>
            <div className="text-sm text-gray-700 dark:text-gray-300">{c.assignment.title}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(c.assignment.startsAt).toLocaleDateString('uz-Cyrl-UZ')} —{' '}
              {new Date(c.assignment.endsAt).toLocaleDateString('uz-Cyrl-UZ')}
            </div>
          </div>
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {uz.candidates.noAssignment}
          </span>
        ),
    },
    {
      key: 'status',
      header: uz.questions.statusLabel,
      render: (c) => <Badge variant={STATUS_BADGE[c.status]}>{STATUS_LABEL[c.status]}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      className: isReadOnly ? 'w-12' : 'w-36',
      render: (c) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            title={uz.candidates.detailTitle}
            aria-label={uz.candidates.detailTitle}
            onClick={() => navigate(`/candidates/${c.id}`)}
          >
            <Eye size={15} />
          </Button>
          {!isReadOnly && (
            <>
              <Button
                variant="ghost"
                size="icon"
                title={uz.common.edit}
                aria-label={uz.common.edit}
                onClick={() => {
                  setEditTarget(c);
                  setFormOpen(true);
                }}
              >
                <Pencil size={15} />
              </Button>
              <Button
                variant="danger"
                size="icon"
                title={uz.candidates.delete}
                aria-label={uz.candidates.delete}
                onClick={() => setDeleteTarget(c)}
              >
                <Trash2 size={15} />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={uz.candidates.title}
        actions={
          !isReadOnly && (
            <Button
              size="icon"
              title={uz.candidates.add}
              aria-label={uz.candidates.add}
              onClick={() => {
                setEditTarget(null);
                setFormOpen(true);
              }}
            >
              <Plus size={16} />
            </Button>
          )
        }
      />

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/50 dark:bg-red-900/30 dark:text-red-400">
          {actionError}
        </div>
      )}

      {/* Joriy / O'tganlar bo'limi — tugash sanasi bo'yicha ajratiladi */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 dark:bg-gray-800 dark:border-gray-700">
          {(
            [
              ['current', uz.candidates.viewCurrent],
              ['archived', uz.candidates.viewArchived],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => changeView(v)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                view === v
                  ? 'bg-white text-blue-700 dark:bg-gray-700 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {view === 'current' ? uz.candidates.viewCurrentHint : uz.candidates.viewArchivedHint}
        </p>
      </div>

      {/* Bugungi ko'rinish — ekspert uchun bosh sahifa vazifasini bajaradi */}
      {isReadOnly && view === 'current' && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:bg-gray-800 dark:border-gray-700">
          <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-gray-100">
            {uz.candidates.todaySection}
          </h2>
          {todayCandidates.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">{uz.candidates.todayNone}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  {
                    label: uz.candidates.allStatuses,
                    count: todayCandidates.length,
                    color:
                      'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-300',
                    value: '' as CandidateStatus | '',
                  },
                  {
                    label: uz.candidates.statusPending,
                    count: todayCandidates.filter((c) => c.status === 'pending').length,
                    color:
                      'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700/50 dark:text-yellow-400',
                    value: 'pending' as CandidateStatus,
                  },
                  {
                    label: uz.candidates.statusInProgress,
                    count: todayCandidates.filter((c) => c.status === 'in_progress').length,
                    color:
                      'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700/50 dark:text-blue-400',
                    value: 'in_progress' as CandidateStatus,
                  },
                ] as const
              ).map(({ label, count, color, value }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={`rounded-lg border p-4 text-left transition-all hover:opacity-80 ${color} ${statusFilter === value ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`}
                >
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="mt-1 text-xs font-medium">{label}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1.5 dark:text-gray-300">
              {uz.common.search}
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={uz.candidates.searchPlaceholder}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400"
            />
          </div>
          <div className="w-44">
            <Select
              label={uz.questions.statusLabel}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CandidateStatus | '')}
            >
              <option value="">{uz.candidates.allStatuses}</option>
              <option value="pending">{uz.candidates.statusPending}</option>
              <option value="in_progress">{uz.candidates.statusInProgress}</option>
              <option value="completed">{uz.candidates.statusCompleted}</option>
              <option value="no_show">{uz.candidates.statusNoShow}</option>
            </Select>
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        data={paged}
        rowKey={(c) => c.id}
        loading={loading}
        error={error}
        emptyText={uz.candidates.emptyText}
        onRetry={load}
      />

      {filtered.length > PAGE_LIMIT && (
        <Pagination page={page} total={filtered.length} limit={PAGE_LIMIT} onChange={setPage} />
      )}

      <CandidateFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={(saved) => {
          setCandidates((prev) => {
            const idx = prev.findIndex((c) => c.id === saved.id);
            const row: CandidateListRow = {
              id: saved.id,
              fullName: saved.fullName,
              phone: saved.phone,
              status: saved.status,
              createdAt: saved.createdAt,
              assignment: null,
            };
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = { ...prev[idx], ...row };
              return next;
            }
            return [row, ...prev];
          });
        }}
        initial={editTarget}
      />

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={uz.candidates.delete}
        footer={
          <>
            <Button
              variant="secondary"
              size="icon"
              title={uz.common.cancel}
              aria-label={uz.common.cancel}
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              <Trash2 size={16} />
            </Button>
            <Button
              variant="danger"
              size="icon"
              title={uz.candidates.delete}
              aria-label={uz.candidates.delete}
              loading={deleting}
              onClick={handleDelete}
            >
              <Trash2 size={16} />
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700 dark:text-gray-300">{uz.candidates.deleteConfirm}</p>
      </Modal>
    </div>
  );
}
