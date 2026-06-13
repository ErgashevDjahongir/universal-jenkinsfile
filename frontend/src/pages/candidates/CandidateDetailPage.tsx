import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { Badge, Button, Modal } from '@/components/ui';
import { uz } from '@/i18n/uz';
import { useAuth } from '@/auth/useAuth';
import { UserRole } from '@/auth/roles';
import {
  deleteCandidateDocument,
  downloadCandidateDocument,
  getCandidate,
  uploadCandidateDocument,
  type CandidateAssignmentView,
  type CandidateDetail,
  type CandidateStatus,
  type DocumentType,
} from '@/api/candidates';
import { CandidateFormModal } from './CandidateFormModal';
import { AssignmentModal } from './AssignmentModal';

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

const DOC_TYPES: { type: DocumentType; label: string }[] = [
  { type: 'recommendation', label: uz.candidates.docRecommendation },
  { type: 'reference', label: uz.candidates.docReference },
  { type: 'application', label: uz.candidates.docApplication },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('uz-Cyrl-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isReadOnly = user?.role === UserRole.EXPERT;
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [docDeleteTarget, setDocDeleteTarget] = useState<DocumentType | null>(null);
  const [docDeleting, setDocDeleting] = useState(false);
  const [docUploading, setDocUploading] = useState<DocumentType | null>(null);
  const [docDownloading, setDocDownloading] = useState<DocumentType | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingDocType = useRef<DocumentType | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getCandidate(id);
      setCandidate(data);
    } catch {
      setError(uz.common.error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  function getDoc(type: DocumentType) {
    return candidate?.documents.find((d) => d.docType === type) ?? null;
  }

  function openFilePicker(docType: DocumentType) {
    pendingDocType.current = docType;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const docType = pendingDocType.current;
    if (!file || !docType || !id) return;
    setDocUploading(docType);
    setActionError(null);
    try {
      const doc = await uploadCandidateDocument(id, docType, file);
      setCandidate((prev) => {
        if (!prev) return prev;
        const filtered = prev.documents.filter((d) => d.docType !== docType);
        return { ...prev, documents: [...filtered, doc] };
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ??
            err.message)
          : uz.common.error;
      setActionError(msg);
    } finally {
      setDocUploading(null);
    }
  }

  async function handleDocDelete() {
    if (!docDeleteTarget || !id) return;
    setDocDeleting(true);
    setActionError(null);
    try {
      await deleteCandidateDocument(id, docDeleteTarget);
      setCandidate((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          documents: prev.documents.filter((d) => d.docType !== docDeleteTarget),
        };
      });
      setDocDeleteTarget(null);
    } catch {
      setActionError(uz.common.error);
    } finally {
      setDocDeleting(false);
    }
  }

  async function handleDownload(docType: DocumentType, originalName: string) {
    if (!id) return;
    setDocDownloading(docType);
    setActionError(null);
    try {
      await downloadCandidateDocument(id, docType, originalName);
    } catch {
      setActionError(uz.common.error);
    } finally {
      setDocDownloading(null);
    }
  }

  function handleAssignmentSaved(assignment: CandidateAssignmentView) {
    setCandidate((prev) => (prev ? { ...prev, assignment } : prev));
  }

  const canEditAssignment = candidate?.assignment !== null && candidate?.result === null;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-40 animate-pulse rounded-lg bg-gray-100" />
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/candidates')}>
          <ArrowLeft size={16} /> {uz.common.back}
        </Button>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error ?? uz.common.error}
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          {uz.common.retry}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          title={uz.common.back}
          aria-label={uz.common.back}
          onClick={() => navigate('/candidates')}
        >
          <ArrowLeft size={16} />
        </Button>
        <h1 className="flex-1 text-2xl font-semibold text-gray-900">{uz.candidates.detailTitle}</h1>
        {!isReadOnly && (
          <Button
            variant="ghost"
            size="icon"
            title={uz.common.edit}
            aria-label={uz.common.edit}
            onClick={() => setEditOpen(true)}
          >
            <Pencil size={15} />
          </Button>
        )}
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
          <button className="ml-2 text-red-500" onClick={() => setActionError(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Asosiy ma'lumot */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-medium text-gray-900">{uz.candidates.infoTitle}</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-500">{uz.candidates.fullNameLabel}</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900">{candidate.fullName}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">{uz.candidates.phoneLabel}</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{candidate.phone}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">{uz.questions.statusLabel}</dt>
            <dd className="mt-0.5">
              <Badge variant={STATUS_BADGE[candidate.status]}>
                {STATUS_LABEL[candidate.status]}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">{uz.sessions.startedAt}</dt>
            <dd className="mt-0.5 text-sm text-gray-900">{formatDate(candidate.createdAt)}</dd>
          </div>
        </dl>
      </div>

      {/* Hujjatlar */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-medium text-gray-900">{uz.candidates.documentsTitle}</h2>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="space-y-3">
          {DOC_TYPES.map(({ type, label }) => {
            const doc = getDoc(type);
            return (
              <div
                key={type}
                className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-700">{label}</div>
                  {doc ? (
                    <div className="text-xs text-gray-500 truncate">
                      {doc.originalName} · {formatFileSize(doc.fileSize)} ·{' '}
                      {formatDate(doc.uploadedAt)}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">{uz.candidates.noDoc}</div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {doc ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={uz.candidates.downloadDoc}
                        aria-label={uz.candidates.downloadDoc}
                        loading={docDownloading === type}
                        onClick={() => handleDownload(type, doc.originalName)}
                      >
                        <Download size={15} />
                      </Button>
                      {!isReadOnly && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={uz.candidates.replaceDoc}
                            aria-label={uz.candidates.replaceDoc}
                            loading={docUploading === type}
                            onClick={() => openFilePicker(type)}
                          >
                            <Upload size={15} />
                          </Button>
                          <Button
                            variant="danger"
                            size="icon"
                            title={uz.candidates.deleteDoc}
                            aria-label={uz.candidates.deleteDoc}
                            onClick={() => setDocDeleteTarget(type)}
                          >
                            <Trash2 size={15} />
                          </Button>
                        </>
                      )}
                    </>
                  ) : (
                    !isReadOnly && (
                      <Button
                        variant="secondary"
                        size="icon"
                        title={uz.candidates.uploadDoc}
                        aria-label={uz.candidates.uploadDoc}
                        loading={docUploading === type}
                        onClick={() => openFilePicker(type)}
                      >
                        <Plus size={15} />
                      </Button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-gray-400">{uz.candidates.docHint}</p>
      </div>

      {/* Tayinlov */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">{uz.candidates.assignmentTitle}</h2>
          {!isReadOnly &&
            (candidate.assignment === null ? (
              <Button
                size="icon"
                title={uz.candidates.assign}
                aria-label={uz.candidates.assign}
                onClick={() => setAssignOpen(true)}
              >
                <Plus size={16} />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                title={uz.candidates.assignEdit}
                aria-label={uz.candidates.assignEdit}
                disabled={!canEditAssignment}
                onClick={() => setAssignOpen(true)}
              >
                <Pencil size={15} />
              </Button>
            ))}
        </div>
        {candidate.assignment ? (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-gray-500">{uz.candidates.assignTitleLabel}</dt>
              <dd className="mt-0.5 text-sm font-medium text-gray-900">
                {candidate.assignment.title}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">{uz.candidates.startsAtLabel}</dt>
              <dd className="mt-0.5 text-sm text-gray-900">
                {formatDate(candidate.assignment.startsAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">{uz.candidates.endsAtLabel}</dt>
              <dd className="mt-0.5 text-sm text-gray-900">
                {formatDate(candidate.assignment.endsAt)}
              </dd>
            </div>
            {!canEditAssignment && candidate.result !== null && (
              <div className="sm:col-span-2">
                <p className="text-xs text-warning-600 text-yellow-600">
                  {uz.candidates.assignmentStarted}
                </p>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-gray-400">{uz.candidates.noAssignment}</p>
        )}
      </div>

      {/* Natija */}
      {candidate.result && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-medium text-gray-900">{uz.candidates.resultTitle}</h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-gray-500">{uz.sessions.score}</dt>
              <dd className="mt-0.5 text-sm font-medium text-gray-900">
                {candidate.result.score} / {candidate.result.maxScore}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">{uz.reports.percentColumn}</dt>
              <dd className="mt-0.5 text-sm text-gray-900">{candidate.result.percent}%</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">{uz.dashboard.passed}</dt>
              <dd className="mt-0.5">
                <Badge variant={candidate.result.passed ? 'success' : 'danger'}>
                  {candidate.result.passed ? uz.dashboard.passed : uz.dashboard.failed}
                </Badge>
              </dd>
            </div>
            {candidate.result.finishedAt && (
              <div>
                <dt className="text-xs text-gray-500">{uz.sessions.finishedAt}</dt>
                <dd className="mt-0.5 text-sm text-gray-900">
                  {formatDate(candidate.result.finishedAt)}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Modalar */}
      <CandidateFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={(saved) => setCandidate((prev) => (prev ? { ...prev, ...saved } : prev))}
        initial={candidate}
      />

      <AssignmentModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        candidateId={candidate.id}
        existing={candidate.assignment}
        onSaved={handleAssignmentSaved}
      />

      <Modal
        open={docDeleteTarget !== null}
        onClose={() => setDocDeleteTarget(null)}
        title={uz.candidates.deleteDoc}
        footer={
          <>
            <Button
              variant="secondary"
              size="icon"
              title={uz.common.cancel}
              aria-label={uz.common.cancel}
              onClick={() => setDocDeleteTarget(null)}
              disabled={docDeleting}
            >
              <X size={16} />
            </Button>
            <Button
              variant="danger"
              size="icon"
              title={uz.candidates.deleteDoc}
              aria-label={uz.candidates.deleteDoc}
              loading={docDeleting}
              onClick={handleDocDelete}
            >
              <Trash2 size={16} />
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700">{uz.candidates.deleteDocConfirm}</p>
      </Modal>
    </div>
  );
}
