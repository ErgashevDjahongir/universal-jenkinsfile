import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Eye, FileDown } from 'lucide-react';
import { getAssignments, type TestAssignment } from '@/api/assignments';
import { getDepartments, type Department } from '@/api/departments';
import {
  downloadExcel,
  downloadPdf,
  getQuestionAnalysis,
  getRankings,
  type QuestionAnalysisRow,
  type RankingRow,
  type ReportFilter,
} from '@/api/reports';
import { getTemplates, type TestTemplate } from '@/api/templates';
import { Avatar, Badge, Button, PageHeader, Select } from '@/components/ui';
import { DataState } from '@/components/ui/DataState';
import { uz } from '@/i18n/uz';

type Tab = 'rankings' | 'analysis';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
}

export function ReportsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('rankings');

  // Filter state
  const [filter, setFilter] = useState<ReportFilter>({});
  const [departments, setDepartments] = useState<Department[]>([]);
  const [templates, setTemplates] = useState<TestTemplate[]>([]);
  const [assignments, setAssignments] = useState<TestAssignment[]>([]);

  // Data state
  const [rankings, setRankings] = useState<RankingRow[]>([]);
  const [analysis, setAnalysis] = useState<QuestionAnalysisRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);

  // Load filter options once
  useEffect(() => {
    void getDepartments()
      .then(setDepartments)
      .catch(() => []);
    void getTemplates({ status: 'active' })
      .then(setTemplates)
      .catch(() => []);
    void getAssignments()
      .then(setAssignments)
      .catch(() => []);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'rankings') {
        setRankings(await getRankings(filter));
      } else {
        setAnalysis(await getQuestionAnalysis());
      }
    } catch {
      setError(uz.common.error);
    } finally {
      setLoading(false);
    }
  }, [tab, filter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function setFilterField(key: keyof ReportFilter, value: string) {
    setFilter((prev) => ({ ...prev, [key]: value || undefined }));
  }

  async function handleExcelExport() {
    setExporting(true);
    try {
      await downloadExcel(filter);
    } catch {
      // silent — browser will handle
    } finally {
      setExporting(false);
    }
  }

  async function handlePdfExport(sessionId: string) {
    setPdfLoading(sessionId);
    try {
      await downloadPdf(sessionId);
    } catch {
      // silent
    } finally {
      setPdfLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={uz.reports.title} />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {[
          { key: 'rankings' as Tab, label: uz.reports.tabRankings },
          { key: 'analysis' as Tab, label: uz.reports.tabAnalysis },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              'px-4 py-2 text-sm font-medium transition-colors',
              tab === t.key
                ? 'border-b-2 border-blue-600 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Rankings filters */}
      {tab === 'rankings' && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-gray-800 dark:border-gray-700">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label={uz.reports.filterDepartment}
              value={filter.departmentId ?? ''}
              onChange={(e) => setFilterField('departmentId', e.target.value)}
            >
              <option value="">{uz.reports.allDepartments}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>

            <Select
              label={uz.reports.filterTemplate}
              value={filter.templateId ?? ''}
              onChange={(e) => setFilterField('templateId', e.target.value)}
            >
              <option value="">{uz.reports.allTemplates}</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </Select>

            <Select
              label={uz.reports.filterAssignment}
              value={filter.assignmentId ?? ''}
              onChange={(e) => setFilterField('assignmentId', e.target.value)}
            >
              <option value="">{uz.reports.allAssignments}</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </Select>

            <div className="flex items-end gap-2">
              <Button
                variant="primary"
                size="icon"
                title={uz.reports.exportExcel}
                aria-label={uz.reports.exportExcel}
                loading={exporting}
                onClick={handleExcelExport}
              >
                <Download size={16} />
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                {uz.reports.filterDateFrom}
              </label>
              <input
                type="date"
                value={filter.dateFrom ?? ''}
                onChange={(e) => setFilterField('dateFrom', e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                {uz.reports.filterDateTo}
              </label>
              <input
                type="date"
                value={filter.dateTo ?? ''}
                onChange={(e) => setFilterField('dateTo', e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
              />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <DataState
        loading={loading}
        error={error}
        isEmpty={tab === 'rankings' ? rankings.length === 0 : analysis.length === 0}
        emptyText={tab === 'rankings' ? uz.reports.rankingsEmpty : uz.reports.analysisEmpty}
        onRetry={loadData}
      >
        {tab === 'rankings' ? (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                  <th className="px-3 py-3 text-left font-medium text-gray-600 dark:text-gray-400">
                    {uz.reports.rankColumn}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">
                    {uz.reports.nameColumn}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">
                    {uz.reports.departmentColumn}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">
                    {uz.reports.assignmentColumn}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">
                    {uz.reports.scoreColumn}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">
                    {uz.reports.percentColumn}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">
                    {uz.reports.passedColumn}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">
                    {uz.reports.gradeColumn}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">
                    {uz.reports.dateColumn}
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rankings.map((row) => (
                  <tr
                    key={row.sessionId}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-3 py-3 text-center font-medium text-gray-500 dark:text-gray-400">
                      {row.rank}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      <div className="flex items-center gap-3">
                        <Avatar name={row.fullName} />
                        <span>{row.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {row.departmentName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {row.assignmentTitle}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {row.score && row.maxScore
                        ? `${parseFloat(row.score).toFixed(1)} / ${parseFloat(row.maxScore).toFixed(1)}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {row.percent ? `${parseFloat(row.percent).toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {row.passed !== null ? (
                        <Badge variant={row.passed ? 'success' : 'danger'}>
                          {row.passed ? uz.reports.passed : uz.reports.failed}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {row.grade ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {formatDate(row.finishedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title={uz.sessions.viewDetail}
                          aria-label={uz.sessions.viewDetail}
                          onClick={() => navigate(`/results/${row.sessionId}`)}
                        >
                          <Eye size={15} />
                        </Button>
                        {row.passed && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title={uz.reports.exportPdf}
                            aria-label={uz.reports.exportPdf}
                            loading={pdfLoading === row.sessionId}
                            onClick={() => handlePdfExport(row.sessionId)}
                          >
                            <FileDown size={15} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                  <th className="px-3 py-3 text-left font-medium text-gray-600 dark:text-gray-400">
                    {uz.reports.rankColumn}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">
                    {uz.reports.analysisColumn}
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">
                    {uz.reports.timesUsed}
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">
                    {uz.reports.errorCount}
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">
                    {uz.reports.errorRate}
                  </th>
                </tr>
              </thead>
              <tbody>
                {analysis.map((row, i) => (
                  <tr
                    key={row.questionId}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-3 py-3 text-center text-gray-500 dark:text-gray-400">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3 text-gray-900 max-w-lg dark:text-gray-100">
                      <p className="line-clamp-2">{row.text}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {row.timesUsed}
                    </td>
                    <td className="px-4 py-3 text-right text-red-700 font-medium dark:text-red-400">
                      {row.errorCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={[
                          'inline-block rounded px-2 py-0.5 text-xs font-medium',
                          row.errorRate >= 70
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                            : row.errorRate >= 40
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
                        ].join(' ')}
                      >
                        {row.errorRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataState>
    </div>
  );
}
