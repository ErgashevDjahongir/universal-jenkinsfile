import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { UserRole } from '@/auth/roles';
import { Avatar, Badge, Button, PageHeader } from '@/components/ui';
import { DataState } from '@/components/ui/DataState';
import { uz } from '@/i18n/uz';
import { getDashboard, type DashboardStats } from '@/api/reports';

interface StatCardProps {
  label: string;
  value: number;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-gray-900">{value.toLocaleString('ru-RU')}</p>
    </div>
  );
}

function formatPercent(percent: string | null): string {
  if (!percent) return '—';
  return `${parseFloat(percent).toFixed(1)}%`;
}

function formatScore(score: string | null, max: string | null): string {
  if (!score || !max) return '—';
  return `${parseFloat(score).toFixed(1)} / ${parseFloat(max).toFixed(1)}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function remainingSeconds(deadlineAt: string): number {
  return Math.max(0, Math.floor((new Date(deadlineAt).getTime() - Date.now()) / 1000));
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canViewReports =
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.EXPERT;
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!canViewReports) return;
    setLoading(true);
    getDashboard()
      .then(setStats)
      .catch(() => setError(uz.common.error))
      .finally(() => setLoading(false));
  }, [canViewReports]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!canViewReports) {
    return (
      <div className="space-y-4">
        <PageHeader title={uz.dashboard.title} />
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-600">
            {uz.auth.welcome}, {user?.firstName}!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={uz.dashboard.title} />

      <DataState
        loading={loading}
        error={error}
        onRetry={() => {
          setLoading(true);
          setError(null);
          getDashboard()
            .then(setStats)
            .catch(() => setError(uz.common.error))
            .finally(() => setLoading(false));
        }}
      >
        {stats && (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label={uz.dashboard.totalQuestions} value={stats.totalQuestions} />
              <StatCard label={uz.dashboard.activeTemplates} value={stats.activeTemplates} />
              <StatCard label={uz.dashboard.todaySessions} value={stats.todaySessions} />
              <StatCard label={uz.dashboard.pendingAssignments} value={stats.pendingAssignments} />
            </div>

            {/* Active sessions */}
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <h2 className="text-lg font-medium text-gray-900">{uz.dashboard.activeSessions}</h2>
                <Button variant="ghost" size="sm" onClick={() => navigate('/sessions')}>
                  {uz.sessions.monitoringTitle} →
                </Button>
              </div>
              {stats.activeSessions.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-gray-500">
                  {uz.dashboard.noActiveSessions}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="px-4 py-2 text-left font-medium text-gray-600">
                          {uz.sessions.examinee}
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">
                          {uz.assignments.title}
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">
                          {uz.sessions.timeLeft}
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">
                          {uz.sessions.tabSwitchesHeader}
                        </th>
                        <th className="px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {stats.activeSessions.map((row) => {
                        void tick;
                        const secs = remainingSeconds(row.deadlineAt);
                        return (
                          <tr key={row.sessionId} className="border-b border-gray-50 last:border-0">
                            <td className="px-4 py-2 text-gray-900">
                              <div className="flex items-center gap-3">
                                <Avatar name={row.fullName || `ID: ${row.userId}`} />
                                <span>{row.fullName || `ID: ${row.userId}`}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-gray-700">{row.assignmentTitle}</td>
                            <td
                              className={`px-4 py-2 font-mono ${secs < 300 ? 'text-red-600' : 'text-gray-700'}`}
                            >
                              {formatTime(secs)}
                            </td>
                            <td
                              className={`px-4 py-2 ${row.tabSwitches > 0 ? 'text-yellow-700' : 'text-gray-500'}`}
                            >
                              {row.tabSwitches}
                            </td>
                            <td className="px-4 py-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/results/${row.sessionId}`)}
                              >
                                {uz.sessions.viewDetail}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent results */}
            <div className="rounded-lg border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <h2 className="text-lg font-medium text-gray-900">{uz.dashboard.recentResults}</h2>
                <Button variant="ghost" size="sm" onClick={() => navigate('/reports')}>
                  {uz.reports.title} →
                </Button>
              </div>
              {stats.recentResults.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-gray-500">
                  {uz.dashboard.noRecentResults}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="px-4 py-2 text-left font-medium text-gray-600">
                          {uz.reports.nameColumn}
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">
                          {uz.assignments.title}
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">
                          {uz.reports.scoreColumn}
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">
                          {uz.reports.passedColumn}
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">
                          {uz.sessions.finishedAt}
                        </th>
                        <th className="px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentResults.map((row) => (
                        <tr key={row.sessionId} className="border-b border-gray-50 last:border-0">
                          <td className="px-4 py-2 text-gray-900">
                            <div className="flex items-center gap-3">
                              <Avatar name={row.fullName || `ID: ${row.userId}`} />
                              <span>{row.fullName || `ID: ${row.userId}`}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-gray-700">{row.assignmentTitle}</td>
                          <td className="px-4 py-2 text-gray-700">
                            {formatScore(row.score, row.maxScore)}
                            {row.percent && (
                              <span className="ml-1 text-xs text-gray-400">
                                ({formatPercent(row.percent)})
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {row.passed !== null ? (
                              <Badge variant={row.passed ? 'success' : 'danger'}>
                                {row.passed ? uz.dashboard.passed : uz.dashboard.failed}
                              </Badge>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-gray-500">{formatDate(row.finishedAt)}</td>
                          <td className="px-4 py-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/results/${row.sessionId}`)}
                            >
                              {uz.sessions.viewDetail}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </DataState>
    </div>
  );
}
