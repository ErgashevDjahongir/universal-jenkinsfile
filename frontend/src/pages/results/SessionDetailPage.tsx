import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RotateCcw, StopCircle, X, XCircle } from 'lucide-react';
import { UserRole } from '@/auth/roles';
import { useAuth } from '@/auth/useAuth';
import { Badge, Button, DataState, Modal, PageHeader } from '@/components/ui';
import { uz } from '@/i18n/uz';
import {
  allowRetry,
  cancelSession,
  getSessionReview,
  terminateSession,
  type SessionReview,
  type SessionReviewQuestion,
  type SessionStatus,
} from '@/api/sessions';

const STATUS_BADGE: Record<SessionStatus, 'success' | 'danger' | 'warning' | 'neutral'> = {
  ready: 'neutral',
  in_progress: 'warning',
  completed: 'success',
  expired: 'neutral',
  cancelled: 'neutral',
  terminated: 'danger',
  void: 'neutral',
};

const STATUS_LABEL: Record<SessionStatus, string> = {
  ready: uz.sessions.statusReady,
  in_progress: uz.sessions.statusInProgress,
  completed: uz.sessions.statusCompleted,
  expired: uz.sessions.statusExpired,
  cancelled: uz.sessions.statusCancelled,
  terminated: uz.sessions.statusTerminated,
  void: uz.sessions.statusVoid,
};

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('uz-UZ');
}

function renderGivenAnswer(q: SessionReviewQuestion): string {
  if (!q.givenAnswer) return uz.sessions.notAnswered;
  const a = q.givenAnswer as Record<string, unknown>;
  if (Array.isArray(a['selectedOptionIds'])) {
    const ids = a['selectedOptionIds'] as string[];
    return (
      ids.map((id) => q.options.find((o) => o.id === id)?.text ?? id).join(', ') ||
      uz.sessions.notAnswered
    );
  }
  if (Array.isArray(a['matchPairs'])) {
    const pairs = a['matchPairs'] as { optionId: string; value: string }[];
    return pairs
      .map((p) => {
        const opt = q.options.find((o) => o.id === p.optionId);
        return `${opt?.text ?? p.optionId} → ${p.value}`;
      })
      .join('; ');
  }
  if (typeof a['text'] === 'string') return a['text'];
  return JSON.stringify(q.givenAnswer);
}

function correctAnswerText(q: SessionReviewQuestion): string {
  if (q.type === 'matching') {
    return q.options
      .filter((o) => o.matchPair)
      .map((o) => `${o.text} → ${o.matchPair}`)
      .join('; ');
  }
  return (
    q.options
      .filter((o) => o.isCorrect)
      .map((o) => o.text)
      .join(', ') || '—'
  );
}

function categoryBreakdown(questions: SessionReviewQuestion[]) {
  const map = new Map<
    string,
    { total: number; correct: number; points: number; awarded: number }
  >();
  questions.forEach((q) => {
    const key = q.type;
    const prev = map.get(key) ?? { total: 0, correct: 0, points: 0, awarded: 0 };
    map.set(key, {
      total: prev.total + 1,
      correct: prev.correct + (q.isCorrect ? 1 : 0),
      points: prev.points + parseFloat(q.points || '0'),
      awarded: prev.awarded + parseFloat(q.awardedPoints ?? '0'),
    });
  });
  return Array.from(map.entries());
}

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  // Ekspert faqat tahlilni ko'radi; sessiyani boshqarish — admin.
  const canManage = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;
  const [review, setReview] = useState<SessionReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [retryCode, setRetryCode] = useState<string | null>(null);
  const [terminateConfirm, setTerminateConfirm] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setReview(await getSessionReview(id));
    } catch {
      setError(uz.common.error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleTerminate() {
    if (!id) return;
    setActionError(null);
    setActionLoading('terminate');
    try {
      await terminateSession(id);
      await load();
    } catch {
      setActionError(uz.common.error);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel() {
    if (!id) return;
    setActionError(null);
    setActionLoading('cancel');
    try {
      await cancelSession(id);
      await load();
    } catch {
      setActionError(uz.common.error);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAllowRetry() {
    if (!id) return;
    setActionError(null);
    setActionLoading('retry');
    try {
      const result = await allowRetry(id);
      setRetryCode(result.code);
    } catch {
      setActionError(uz.common.error);
    } finally {
      setActionLoading(null);
    }
  }

  const sess = review?.session;
  const questions = review?.questions ?? [];
  const breakdown = categoryBreakdown(questions);
  const correctCount = questions.filter((q) => q.isCorrect === true).length;
  const totalQCount = questions.length;

  return (
    <div className="space-y-6">
      <PageHeader
        leading={
          <Button
            variant="ghost"
            size="icon"
            title={uz.common.back}
            aria-label={uz.common.back}
            onClick={() => navigate('/sessions')}
          >
            <ArrowLeft size={16} />
          </Button>
        }
        title={uz.sessions.detailTitle}
      />

      <DataState loading={loading} error={error} onRetry={load} isEmpty={!review}>
        {review && sess && (
          <div className="space-y-6">
            {/* Header card */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Badge variant={STATUS_BADGE[sess.status as SessionStatus]}>
                      {STATUS_LABEL[sess.status as SessionStatus]}
                    </Badge>
                    {sess.isPreview && <Badge variant="neutral">{uz.sessions.preview}</Badge>}
                    {sess.passed !== null && (
                      <Badge variant={sess.passed ? 'success' : 'danger'}>
                        {sess.passed ? uz.sessions.passed : uz.sessions.failed}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                    <span className="text-gray-500">{uz.sessions.examinee}:</span>
                    <span className="text-gray-900">{sess.userFullName || sess.userId}</span>
                    <span className="text-gray-500">{uz.sessions.startedAt}:</span>
                    <span className="text-gray-900">{formatDate(sess.startedAt)}</span>
                    <span className="text-gray-500">{uz.sessions.finishedAt}:</span>
                    <span className="text-gray-900">{formatDate(sess.finishedAt)}</span>
                    <span className="text-gray-500">{uz.sessions.deadline}:</span>
                    <span className="text-gray-900">{formatDate(sess.deadlineAt)}</span>
                    <span className="text-gray-500">Tab:</span>
                    <span className="text-gray-900">{sess.tabSwitches}</span>
                  </div>
                  {sess.score !== null && (
                    <p className="text-sm font-medium text-gray-900">
                      {uz.sessions.score
                        .replace('{score}', sess.score ?? '—')
                        .replace('{max}', sess.maxScore ?? '—')
                        .replace('{percent}', sess.percent ?? '—')}
                      {sess.grade && ` · ${uz.sessions.grade.replace('{grade}', sess.grade)}`}
                      {totalQCount > 0 &&
                        ` · ${uz.sessions.correctCountShort.replace('{correct}', String(correctCount)).replace('{total}', String(totalQCount))}`}
                    </p>
                  )}
                </div>

                {/* Admin actions */}
                {canManage && sess.status === 'in_progress' && (
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="danger"
                      size="icon"
                      title={uz.sessions.terminate}
                      aria-label={uz.sessions.terminate}
                      loading={actionLoading === 'terminate'}
                      onClick={() => setTerminateConfirm(true)}
                    >
                      <StopCircle size={16} />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      title={uz.sessions.cancel}
                      aria-label={uz.sessions.cancel}
                      loading={actionLoading === 'cancel'}
                      onClick={() => setCancelConfirm(true)}
                    >
                      <XCircle size={16} />
                    </Button>
                  </div>
                )}
                {canManage && sess.status !== 'in_progress' && (
                  <Button
                    variant="secondary"
                    size="icon"
                    title={uz.sessions.allowRetry}
                    aria-label={uz.sessions.allowRetry}
                    loading={actionLoading === 'retry'}
                    onClick={handleAllowRetry}
                  >
                    <RotateCcw size={16} />
                  </Button>
                )}
              </div>

              {actionError && (
                <div className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {actionError}
                </div>
              )}
              {retryCode && (
                <div className="mt-3 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                  {uz.sessions.retryCodeIssued.replace('{code}', retryCode)}
                </div>
              )}
            </div>

            {/* Category breakdown */}
            {breakdown.length > 0 && sess.score !== null && (
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h2 className="mb-4 text-lg font-medium text-gray-900">
                  {uz.sessions.questionAnalysis}
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-500">
                        <th className="pb-2 pr-4 font-medium">Tur</th>
                        <th className="pb-2 pr-4 font-medium">Savollar</th>
                        <th className="pb-2 pr-4 font-medium">To'g'ri</th>
                        <th className="pb-2 pr-4 font-medium">Ball</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {breakdown.map(([type, stat]) => (
                        <tr key={type}>
                          <td className="py-2 pr-4 text-gray-700">{type}</td>
                          <td className="py-2 pr-4 text-gray-900">{stat.total}</td>
                          <td className="py-2 pr-4">
                            <span className={stat.correct > 0 ? 'text-green-700' : 'text-gray-500'}>
                              {stat.correct}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-gray-900">
                            {stat.awarded.toFixed(1)} / {stat.points.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Per-question table */}
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-6 py-4">
                <h2 className="text-lg font-medium text-gray-900">{uz.sessions.perQuestion}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">#</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Savol</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">
                        {uz.sessions.givenAnswer}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">
                        {uz.sessions.correctAnswer}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">
                        {uz.sessions.awardedPoints}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {questions.map((q) => (
                      <tr
                        key={q.sessionQuestionId}
                        className={
                          q.isCorrect === true
                            ? 'bg-green-50/40'
                            : q.isCorrect === false
                              ? 'bg-red-50/40'
                              : ''
                        }
                      >
                        <td className="px-4 py-3 text-gray-500">{q.orderIndex + 1}</td>
                        <td className="max-w-xs px-4 py-3 text-gray-900">{q.text}</td>
                        <td className="px-4 py-3 text-gray-700">{renderGivenAnswer(q)}</td>
                        <td className="px-4 py-3 text-gray-700">{correctAnswerText(q)}</td>
                        <td className="px-4 py-3">
                          {q.awardedPoints !== null ? (
                            <span
                              className={
                                parseFloat(q.awardedPoints) > 0 ? 'text-green-700' : 'text-red-600'
                              }
                            >
                              {q.awardedPoints} / {q.points}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </DataState>

      <Modal
        open={terminateConfirm}
        onClose={() => setTerminateConfirm(false)}
        title={uz.sessions.terminate}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setTerminateConfirm(false)}>
              <X size={14} /> {uz.common.cancel}
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={actionLoading === 'terminate'}
              onClick={() => {
                setTerminateConfirm(false);
                void handleTerminate();
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
        open={cancelConfirm}
        onClose={() => setCancelConfirm(false)}
        title={uz.sessions.cancel}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCancelConfirm(false)}>
              <X size={14} /> {uz.common.cancel}
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={actionLoading === 'cancel'}
              onClick={() => {
                setCancelConfirm(false);
                void handleCancel();
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
