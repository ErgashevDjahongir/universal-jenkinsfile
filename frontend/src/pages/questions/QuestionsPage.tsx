import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Badge, Select, Table, type Column } from '@/components/ui';
import { uz } from '@/i18n/uz';
import { useAuth } from '@/auth/useAuth';
import { UserRole } from '@/auth/roles';
import { getSubjects, getCategories, type Subject, type Category } from '@/api/subjects';
import {
  getQuestions,
  type Question,
  type QuestionFilter,
  type QuestionStatus,
  type DifficultyLevel,
  type QuestionType,
} from '@/api/questions';

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
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSubjects()
      .then(setSubjects)
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

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cleanFilter = Object.fromEntries(
        Object.entries(filter).filter(([, v]) => v !== '' && v !== undefined),
      ) as QuestionFilter;
      setQuestions(await getQuestions(cleanFilter));
    } catch {
      setError(uz.common.error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  function setFilterField<K extends keyof QuestionFilter>(key: K, value: QuestionFilter[K]) {
    setFilter((prev) => ({ ...prev, [key]: value || undefined }));
  }

  const columns: Column<Question>[] = [
    {
      key: 'text',
      header: 'Savol matni',
      render: (q) => <span className="line-clamp-2 max-w-xs text-sm text-gray-900">{q.text}</span>,
    },
    {
      key: 'type',
      header: uz.questions.typeLabel,
      render: (q) => <span className="text-xs text-gray-600">{TYPE_LABELS[q.type]}</span>,
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
      render: (q) => <span className="text-sm text-gray-700">{q.points}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (q) => (
        <Button variant="ghost" size="sm" onClick={() => navigate(`/questions/${q.id}/edit`)}>
          Tahrirlash
        </Button>
      ),
      className: 'w-24',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{uz.questions.title}</h1>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="secondary" size="sm" onClick={() => navigate('/questions/subjects')}>
              {uz.questions.manageSubjects}
            </Button>
          )}
          <Button size="sm" onClick={() => navigate('/questions/new')}>
            {uz.questions.add}
          </Button>
        </div>
      </div>

      {/* Filtrlar */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
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
    </div>
  );
}
