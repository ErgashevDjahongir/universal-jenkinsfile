import { useCallback, useEffect, useState } from 'react';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Modal, Pagination, Select, Table, type Column } from '@/components/ui';
import { uz } from '@/i18n/uz';
import { useAuth } from '@/auth/useAuth';
import { UserRole } from '@/auth/roles';
import {
  deleteCandidate,
  getCandidates,
  type CandidateListRow,
  type CandidateStatus,
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
      const data = await getCandidates({
        status: statusFilter || undefined,
        search: debouncedSearch || undefined,
      });
      setCandidates(data);
      setPage(1);
    } catch {
      setError(uz.common.error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  const paged = candidates.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT);

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
        <div>
          <div className="font-medium text-gray-900">{c.fullName}</div>
          <div className="text-xs text-gray-500">{c.phone}</div>
        </div>
      ),
    },
    {
      key: 'assignment',
      header: uz.candidates.assignmentTitle,
      render: (c) =>
        c.assignment ? (
          <div>
            <div className="text-sm text-gray-700">{c.assignment.title}</div>
            <div className="text-xs text-gray-500">
              {new Date(c.assignment.startsAt).toLocaleDateString('uz-Cyrl-UZ')} —{' '}
              {new Date(c.assignment.endsAt).toLocaleDateString('uz-Cyrl-UZ')}
            </div>
          </div>
        ) : (
          <span className="text-xs text-gray-400">{uz.candidates.noAssignment}</span>
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{uz.candidates.title}</h1>
        {!isReadOnly && (
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
        )}
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {uz.common.search}
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={uz.candidates.searchPlaceholder}
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
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

      {candidates.length > PAGE_LIMIT && (
        <Pagination page={page} total={candidates.length} limit={PAGE_LIMIT} onChange={setPage} />
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
        <p className="text-sm text-gray-700">{uz.candidates.deleteConfirm}</p>
      </Modal>
    </div>
  );
}
