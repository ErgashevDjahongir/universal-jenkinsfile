import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Pencil, Plus, Power, X } from 'lucide-react';
import { Button, Badge, Modal, Select, Table, type Column } from '@/components/ui';
import { uz } from '@/i18n/uz';
import {
  getTemplates,
  activateTemplate,
  archiveTemplate,
  type TestTemplate,
  type TemplateStatus,
} from '@/api/templates';

const STATUS_LABEL: Record<TemplateStatus, string> = {
  draft: uz.templates.statusDraft,
  active: uz.templates.statusActive,
  archived: uz.templates.statusArchived,
};

const STATUS_BADGE: Record<TemplateStatus, 'neutral' | 'success' | 'danger'> = {
  draft: 'neutral',
  active: 'success',
  archived: 'danger',
};

export function TemplatesPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | ''>('');
  const [templates, setTemplates] = useState<TestTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<TestTemplate | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filter = statusFilter ? { status: statusFilter } : undefined;
      setTemplates(await getTemplates(filter));
    } catch {
      setError(uz.common.error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleActivate(id: string) {
    setActionError(null);
    setActionLoading(id + ':activate');
    try {
      const updated = await activateTemplate(id);
      setTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ??
            err.message)
          : uz.templates.activateError;
      setActionError(msg);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleArchive(id: string) {
    setActionError(null);
    setActionLoading(id + ':archive');
    try {
      const updated = await archiveTemplate(id);
      setTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch {
      setActionError(uz.common.error);
    } finally {
      setActionLoading(null);
    }
  }

  const columns: Column<TestTemplate>[] = [
    {
      key: 'title',
      header: uz.templates.titleLabel,
      render: (t) => <span className="max-w-xs text-sm font-medium text-gray-900">{t.title}</span>,
    },
    {
      key: 'status',
      header: uz.questions.statusLabel,
      render: (t) => <Badge variant={STATUS_BADGE[t.status]}>{STATUS_LABEL[t.status]}</Badge>,
    },
    {
      key: 'timeLimitMinutes',
      header: uz.templates.timeLimitLabel,
      render: (t) => <span className="text-sm text-gray-700">{t.timeLimitMinutes} daq</span>,
    },
    {
      key: 'passingScorePercent',
      header: uz.templates.passingScoreLabel,
      render: (t) => <span className="text-sm text-gray-700">{t.passingScorePercent}%</span>,
    },
    {
      key: 'questions',
      header: 'Savollar',
      render: (t) => (
        <span className="text-xs text-gray-500">
          {(t.fixedQuestions ?? []).length} ta qo'lda + {(t.selectionRules ?? []).length} ta qoida
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-52',
      render: (t) => (
        <div className="flex items-center gap-1">
          {t.status === 'draft' && (
            <>
              <Button
                variant="ghost"
                size="icon"
                title={uz.common.edit}
                aria-label={uz.common.edit}
                onClick={() => navigate(`/templates/${t.id}/edit`)}
              >
                <Pencil size={15} />
              </Button>
              <Button
                variant="primary"
                size="icon"
                title={uz.templates.activate}
                aria-label={uz.templates.activate}
                loading={actionLoading === t.id + ':activate'}
                onClick={() => handleActivate(t.id)}
              >
                <Power size={15} />
              </Button>
            </>
          )}
          {t.status === 'active' && (
            <Button
              variant="danger"
              size="icon"
              title={uz.templates.archive}
              aria-label={uz.templates.archive}
              loading={actionLoading === t.id + ':archive'}
              onClick={() => setArchiveConfirm(t)}
            >
              <Archive size={15} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{uz.templates.title}</h1>
        <Button
          size="icon"
          title={uz.templates.add}
          aria-label={uz.templates.add}
          onClick={() => navigate('/templates/new')}
        >
          <Plus size={16} />
        </Button>
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="w-48">
          <Select
            label={uz.questions.statusLabel}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TemplateStatus | '')}
          >
            <option value="">{uz.templates.allStatuses}</option>
            <option value="draft">{uz.templates.statusDraft}</option>
            <option value="active">{uz.templates.statusActive}</option>
            <option value="archived">{uz.templates.statusArchived}</option>
          </Select>
        </div>
      </div>

      <Table
        columns={columns}
        data={templates}
        rowKey={(t) => t.id}
        loading={loading}
        error={error}
        emptyText={uz.templates.emptyText}
        onRetry={load}
      />

      <Modal
        open={archiveConfirm !== null}
        onClose={() => setArchiveConfirm(null)}
        title={uz.templates.archive}
        footer={
          <>
            <Button
              variant="secondary"
              size="icon"
              title={uz.common.cancel}
              aria-label={uz.common.cancel}
              onClick={() => setArchiveConfirm(null)}
            >
              <X size={16} />
            </Button>
            <Button
              variant="danger"
              size="icon"
              title={uz.templates.archive}
              aria-label={uz.templates.archive}
              loading={archiveConfirm ? actionLoading === archiveConfirm.id + ':archive' : false}
              onClick={() => {
                if (archiveConfirm) {
                  void handleArchive(archiveConfirm.id);
                  setArchiveConfirm(null);
                }
              }}
            >
              <Archive size={16} />
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700">{uz.templates.archiving}</p>
      </Modal>
    </div>
  );
}
