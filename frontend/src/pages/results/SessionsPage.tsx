import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, RefreshCw, RotateCcw, StopCircle, X, XCircle } from 'lucide-react';
import { UserRole } from '@/auth/roles';
import { useAuth } from '@/auth/useAuth';
import { Badge, Button, Modal, Select, Table, type Column } from '@/components/ui';
import { uz } from '@/i18n/uz';
import {
  allowRetry,
  cancelSession,
  getSessions,
  terminateSession,
  type MonitorRow,
  type SessionStatus,
} from '@/api/sessions';

type Tab = 'monitoring' | 'list';

const STATUS_LABEL: Record<SessionStatus, string> = {
  in_progress: uz.sessions.statusInProgress,
  completed: uz.sessions.statusCompleted,
  expired: uz.sessions.statusExpired,
  cancelled: uz.sessions.statusCancelled,
  terminated: uz.sessions.statusTerminated,
  void: uz.sessions.statusVoid,
};

const STATUS_BADGE: Record<SessionStatus, 'success' | 'danger' | 'warning' | 'neutral'> = {
  in_progress: 'warning',
  completed: 'success',
  expired: 'neutral',
  cancelled: 'neutral',
  terminated: 'danger',
  void: 'neutral',
};

function formatTime(seconds: number): string {
  if (seconds <= 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function remainingSeconds(deadlineAt: string): number {
  return Math.max(0, Math.floor((new Date(deadlineAt).getTime() - Date.now()) / 1000));
}

export function SessionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Ekspert faqat ko'radi; sessiyani boshqarish (to'xtatish/bekor/qayta urinish) — admin.
  const canManage = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;
  const [tab, setTab] = useState<Tab>('monitoring');
  const [rows, setRows] = useState<MonitorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SessionStatus | ''>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [retryCode, setRetryCode] = useState<{ sessionId: string; code: string } | null>(null);
  const [terminateConfirm, setTerminateConfirm] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status =
        tab === 'monitoring' ? 'in_progress' : (statusFilter as SessionStatus) || undefined;
      setRows(await getSessions(status ? { status } : {}));
    } catch {
      setError(uz.common.error);
    } finally {
      setLoading(false);
    }
  }, [tab, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tab !== 'monitoring') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tab]);

  // refresh monitoring every 30s
  useEffect(() => {
    if (tab !== 'monitoring') return;
    const id = setInterval(() => void load(), 30_000);
    return () => clearInterval(id);
  }, [tab, load]);

  async function handleTerminate(id: string) {
    setActionError(null);
    setActionLoading(id + ':terminate');
    try {
      await terminateSession(id);
      await load();
    } catch {
      setActionError(uz.common.error);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel(id: string) {
    setActionError(null);
    setActionLoading(id + ':cancel');
    try {
      await cancelSession(id);
      await load();
    } catch {
      setActionError(uz.common.error);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAllowRetry(id: string) {
    setActionError(null);
    setActionLoading(id + ':retry');
    try {
      const result = await allowRetry(id);
      setRetryCode({ sessionId: id, code: result.code });
    } catch {
      setActionError(uz.common.error);
    } finally {
      setActionLoading(null);
    }
  }

  const monitorCols: Column<MonitorRow>[] = [
    {
      key: 'user',
      header: uz.sessions.examinee,
      render: (r) => (
        <div>
          <div className="font-medium text-gray-900">{r.fullName || r.userId}</div>
          <div className="text-xs text-gray-500">
            {r.isPreview
              ? uz.sessions.preview
              : `${r.attemptNumber}-${uz.sessions.attempt.replace('{n}', '')}`}
          </div>
        </div>
      ),
    },
    {
      key: 'timeLeft',
      header: uz.sessions.timeLeft,
      render: (r) => {
        void tick;
        const secs = remainingSeconds(r.deadlineAt);
        return (
          <span
            className={
              secs < 300 ? 'font-mono text-sm text-red-600' : 'font-mono text-sm text-gray-900'
            }
          >
            {formatTime(secs)}
          </span>
        );
      },
    },
    {
      key: 'tabSwitches',
      header: 'Tab',
      render: (r) => (
        <span className={r.tabSwitches > 0 ? 'text-sm text-yellow-700' : 'text-sm text-gray-500'}>
          {r.tabSwitches}
        </span>
      ),
    },
    {
      key: 'started',
      header: uz.sessions.startedAt,
      render: (r) => (
        <span className="text-sm text-gray-700">
          {new Date(r.startedAt).toLocaleTimeString('uz-UZ', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-56',
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          <Button
            variant="ghost"
            size="icon"
            title={uz.sessions.viewDetail}
            aria-label={uz.sessions.viewDetail}
            onClick={() => navigate(`/results/${r.id}`)}
          >
            <Eye size={15} />
          </Button>
          {canManage && (
            <>
              <Button
                variant="danger"
                size="icon"
                title={uz.sessions.terminate}
                aria-label={uz.sessions.terminate}
                loading={actionLoading === r.id + ':terminate'}
                onClick={() => setTerminateConfirm(r.id)}
              >
                <StopCircle size={15} />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                title={uz.sessions.cancel}
                aria-label={uz.sessions.cancel}
                loading={actionLoading === r.id + ':cancel'}
                onClick={() => setCancelConfirm(r.id)}
              >
                <XCircle size={15} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title={uz.sessions.allowRetry}
                aria-label={uz.sessions.allowRetry}
                loading={actionLoading === r.id + ':retry'}
                onClick={() => handleAllowRetry(r.id)}
              >
                <RotateCcw size={15} />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const listCols: Column<MonitorRow>[] = [
    {
      key: 'user',
      header: uz.sessions.examinee,
      render: (r) => <span className="text-sm text-gray-900">{r.fullName || r.userId}</span>,
    },
    {
      key: 'status',
      header: uz.sessions.filterStatus,
      render: (r) => <Badge variant={STATUS_BADGE[r.status]}>{STATUS_LABEL[r.status]}</Badge>,
    },
    {
      key: 'attempt',
      header: uz.sessions.attempt.replace('{n}', '#'),
      render: (r) => <span className="text-sm text-gray-700">{r.attemptNumber}</span>,
    },
    {
      key: 'started',
      header: uz.sessions.startedAt,
      render: (r) => (
        <span className="text-sm text-gray-700">
          {new Date(r.startedAt).toLocaleString('uz-UZ')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-28',
      render: (r) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            title={uz.sessions.viewDetail}
            aria-label={uz.sessions.viewDetail}
            onClick={() => navigate(`/results/${r.id}`)}
          >
            <Eye size={15} />
          </Button>
          {canManage && r.status !== 'in_progress' && (
            <Button
              variant="ghost"
              size="icon"
              title={uz.sessions.allowRetry}
              aria-label={uz.sessions.allowRetry}
              loading={actionLoading === r.id + ':retry'}
              onClick={() => handleAllowRetry(r.id)}
            >
              <RotateCcw size={15} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">{uz.sessions.title}</h1>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {retryCode && (
        <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm text-green-800">
            {uz.sessions.retryCodeIssued.replace('{code}', retryCode.code)}
          </p>
          <Button
            variant="ghost"
            size="icon"
            title={uz.common.close}
            aria-label={uz.common.close}
            onClick={() => setRetryCode(null)}
          >
            <X size={16} />
          </Button>
        </div>
      )}

      <div className="flex gap-2 border-b border-gray-200">
        {(
          [
            { key: 'monitoring', label: uz.sessions.monitoringTitle },
            { key: 'list', label: uz.sessions.title },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              'px-4 py-2 text-sm font-medium transition-colors',
              tab === t.key
                ? 'border-b-2 border-blue-600 text-blue-700'
                : 'text-gray-600 hover:text-gray-900',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-4">
            <div className="w-48">
              <Select
                label={uz.sessions.filterStatus}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as SessionStatus | '')}
              >
                <option value="">{uz.sessions.allStatuses}</option>
                {(Object.keys(STATUS_LABEL) as SessionStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="mt-5">
              <Button
                variant="secondary"
                size="icon"
                title={uz.common.retry}
                aria-label={uz.common.retry}
                onClick={load}
              >
                <RefreshCw size={16} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {tab === 'monitoring' && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {rows.length > 0 ? `${rows.length} ta faol sessiya` : uz.sessions.monitoringEmpty}
          </p>
          <Button
            variant="secondary"
            size="icon"
            title={uz.common.retry}
            aria-label={uz.common.retry}
            onClick={load}
          >
            <RefreshCw size={16} />
          </Button>
        </div>
      )}

      <Table
        columns={tab === 'monitoring' ? monitorCols : listCols}
        data={rows}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        emptyText={tab === 'monitoring' ? uz.sessions.monitoringEmpty : uz.sessions.listEmpty}
        onRetry={load}
      />

      <Modal
        open={terminateConfirm !== null}
        onClose={() => setTerminateConfirm(null)}
        title={uz.sessions.terminate}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setTerminateConfirm(null)}>
              <X size={14} /> {uz.common.cancel}
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={terminateConfirm ? actionLoading === terminateConfirm + ':terminate' : false}
              onClick={() => {
                if (terminateConfirm) {
                  void handleTerminate(terminateConfirm);
                  setTerminateConfirm(null);
                }
              }}
            >
              <StopCircle size={14} /> {uz.sessions.terminate}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700">{uz.sessions.terminating}</p>
      </Modal>

      <Modal
        open={cancelConfirm !== null}
        onClose={() => setCancelConfirm(null)}
        title={uz.sessions.cancel}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCancelConfirm(null)}>
              <X size={14} /> {uz.common.cancel}
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={cancelConfirm ? actionLoading === cancelConfirm + ':cancel' : false}
              onClick={() => {
                if (cancelConfirm) {
                  void handleCancel(cancelConfirm);
                  setCancelConfirm(null);
                }
              }}
            >
              <XCircle size={14} /> {uz.sessions.cancel}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700">{uz.sessions.cancelling}</p>
      </Modal>
    </div>
  );
}
