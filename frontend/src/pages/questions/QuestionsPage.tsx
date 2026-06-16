import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Pencil, Plus } from 'lucide-react';
import {
  Button,
  Badge,
  Select,
  Table,
  Pagination,
  PageHeader,
  SafeHtml,
  type Column,
} from '@/components/ui';
import { uz } from '@/i18n/uz';
import { useAuth } from '@/auth/useAuth';
import { UserRole } from '@/auth/roles';
import { getSubjects, getCategories, type Subject, type Category } from '@/api/subjects';
import {
  getQuestionsPage,
  getQuestionCounts,
  type Question,
  type QuestionFilter,
  type QuestionStatus,
  type DifficultyLevel,
  type QuestionType,
  type QuestionCounts,
} from '@/api/questions';

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<QuestionStatus, string> = {
  draft: uz.questions.statusDraft,
  approved: uz.questions.statusApproved,
  active: uz.questions.statusActive,
  archived: uz.questions.statusArchived,
};

const STATUS_BADGE: Record<QuestionStatus, 'neutral' | 'warning' | 'success' | 'danger'> = {
  draft: 'neutral',
  approved: 'warning',
  active: 'success',
  archived: 'danger',
};

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  easy: uz.questions.difficultyEasy,
  medium: uz.questions.difficultyMedium,
  hard: uz.questions.difficultyHard,
};

const TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: uz.questions.typeSingleChoice,
  multiple_choice: uz.questions.typeMultipleChoice,
  true_false: uz.questions.typeTrueFalse,
  matching: uz.questions.typeMatching,
  ordering: uz.questions.typeOrdering,
  short_answer: uz.questions.typeShortAnswer,
};

export function QuestionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN;

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [filter, setFilter] = useState<QuestionFilter>({});
  const [page, setPage] = useState(1);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<QuestionCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSubjects()
      .then(setSubjects)
      .catch(() => {});
    getQuestionCounts()
      .then(setCounts)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (filter.subjectId) {
      getCategories(filter.subjectId)
        .then(setCategories)
        .catch(() => setCategories([]));
    } else {
      setCategories([]);
    }
  }, [filter.subjectId]);

  // Fan/kategoriya yonida ko'rsatish uchun faol savollar sonini tezkor xaritalar.
  const subjectCount = useMemo(() => {
    const map = new Map<string, number>();
    counts?.bySubject.forEach((r) => map.set(r.subjectId, r.count));
    return map;
  }, [counts]);
  const categoryCount = useMemo(() => {
    const map = new Map<string, number>();
    counts?.byCategory.forEach((r) => map.set(r.categoryId, r.count));
    return map;
  }, [counts]);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cleanFilter = Object.fromEntries(
        Object.entries(filter).filter(([, v]) => v !== '' && v !== undefined),
      ) as QuestionFilter;
      const res = await getQuestionsPage(cleanFilter, page, PAGE_SIZE);
      setQuestions(res.items);
      setTotal(res.total);
    } catch {
      setError(uz.common.error);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  // Filtr o'zgarsa — 1-sahifaga qaytamiz.
  function setFilterField<K extends keyof QuestionFilter>(key: K, value: QuestionFilter[K]) {
    setFilter((prev) => ({ ...prev, [key]: value || undefined }));
    setPage(1);
  }

  const columns: Column<Question>[] = [
    {
      key: 'text',
      header: 'Savol matni',
      render: (q) => (
        <div className="group relative max-w-xs">
          <SafeHtml
            html={q.text}
            className="rte-display line-clamp-2 text-sm text-gray-900 dark:text-gray-100"
          />
          {/* To'liq mazmun tooltip */}
          <div className="pointer-events-none absolute left-0 top-full z-50 mt-1 hidden w-80 rounded-lg border border-gray-200 bg-white p-3 shadow-lg group-hover:block dark:border-gray-700 dark:bg-gray-800">
            <SafeHtml
              html={q.text}
              className="rte-display text-sm text-gray-800 dark:text-gray-200"
            />
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: uz.questions.typeLabel,
      render: (q) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">{TYPE_LABELS[q.type]}</span>
      ),
    },
    {
      key: 'difficulty',
      header: uz.questions.difficultyLabel,
      render: (q) => (
        <Badge
          variant={
            q.difficulty === 'easy' ? 'success' : q.difficulty === 'hard' ? 'danger' : 'warning'
          }
        >
          {DIFFICULTY_LABELS[q.difficulty]}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: uz.questions.statusLabel,
      render: (q) => <Badge variant={STATUS_BADGE[q.status]}>{STATUS_LABELS[q.status]}</Badge>,
    },
    {
      key: 'points',
      header: uz.questions.pointsLabel,
      render: (q) => <span className="text-sm text-gray-700 dark:text-gray-300">{q.points}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (q) => (
        <Button
          variant="ghost"
          size="icon"
          title={uz.common.edit}
          aria-label={uz.common.edit}
          onClick={() => navigate(`/questions/${q.id}/edit`)}
        >
          <Pencil size={15} />
        </Button>
      ),
      className: 'w-24',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={uz.questions.title}
        aside={
          counts && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {uz.questions.activeTotal}:{' '}
              <span className="font-medium text-gray-900 dark:text-gray-100">{counts.total}</span>
            </span>
          )
        }
        actions={
          <>
            {isAdmin && (
              <Button
                variant="secondary"
                size="icon"
                title={uz.questions.manageSubjects}
                aria-label={uz.questions.manageSubjects}
                onClick={() => navigate('/questions/subjects')}
              >
                <BookOpen size={16} />
              </Button>
            )}
            <Button
              size="icon"
              title={uz.questions.add}
              aria-label={uz.questions.add}
              onClick={() => navigate('/questions/new')}
            >
              <Plus size={16} />
            </Button>
          </>
        }
      />

      {/* Filtrlar */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:bg-gray-800 dark:border-gray-700">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {uz.questions.filtersLabel}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Select
            label={uz.questions.subjectLabel}
            value={filter.subjectId ?? ''}
            onChange={(e) => {
              setFilterField('subjectId', e.target.value || undefined);
              setFilterField('categoryId', undefined);
            }}
          >
            <option value="">{uz.questions.allSubjects}</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {subjectCount.has(s.id) ? ` (${subjectCount.get(s.id)})` : ''}
              </option>
            ))}
          </Select>

          <Select
            label={uz.questions.categoryLabel}
            value={filter.categoryId ?? ''}
            onChange={(e) => setFilterField('categoryId', e.target.value || undefined)}
            disabled={!filter.subjectId}
          >
            <option value="">{uz.questions.allCategories}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {categoryCount.has(c.id) ? ` (${categoryCount.get(c.id)})` : ''}
              </option>
            ))}
          </Select>

          <Select
            label={uz.questions.difficultyLabel}
            value={filter.difficulty ?? ''}
            onChange={(e) =>
              setFilterField('difficulty', (e.target.value as DifficultyLevel) || undefined)
            }
          >
            <option value="">{uz.questions.allDifficulties}</option>
            <option value="easy">{uz.questions.difficultyEasy}</option>
            <option value="medium">{uz.questions.difficultyMedium}</option>
            <option value="hard">{uz.questions.difficultyHard}</option>
          </Select>

          <Select
            label={uz.questions.statusLabel}
            value={filter.status ?? ''}
            onChange={(e) =>
              setFilterField('status', (e.target.value as QuestionStatus) || undefined)
            }
          >
            <option value="">{uz.questions.allStatuses}</option>
            <option value="draft">{uz.questions.statusDraft}</option>
            <option value="approved">{uz.questions.statusApproved}</option>
            <option value="active">{uz.questions.statusActive}</option>
            <option value="archived">{uz.questions.statusArchived}</option>
          </Select>

          <Select
            label={uz.questions.typeLabel}
            value={filter.type ?? ''}
            onChange={(e) => setFilterField('type', (e.target.value as QuestionType) || undefined)}
          >
            <option value="">{uz.questions.allTypes}</option>
            <option value="single_choice">{uz.questions.typeSingleChoice}</option>
            <option value="multiple_choice">{uz.questions.typeMultipleChoice}</option>
            <option value="true_false">{uz.questions.typeTrueFalse}</option>
            <option value="matching">{uz.questions.typeMatching}</option>
            <option value="ordering">{uz.questions.typeOrdering}</option>
            <option value="short_answer">{uz.questions.typeShortAnswer}</option>
          </Select>
        </div>
      </div>

      <Table
        columns={columns}
        data={questions}
        rowKey={(q) => q.id}
        loading={loading}
        error={error}
        emptyText={uz.questions.emptyText}
        onRetry={loadQuestions}
      />

      <Pagination page={page} total={total} limit={PAGE_SIZE} onChange={setPage} />
    </div>
  );
}
