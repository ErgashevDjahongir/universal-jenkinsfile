import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Input, Select, Modal } from '@/components/ui';
import { uz } from '@/i18n/uz';
import {
  getTemplate,
  createTemplate,
  updateTemplate,
  activateTemplate,
  checkTemplateSelection,
  type CreateTemplateDto,
  type NavigationMode,
  type ResultVisibility,
  type DifficultyLevel,
  type GradeValue,
  type SelectionShortage,
  type TestTemplate,
} from '@/api/templates';
import { getQuestions, getQuestion, type Question } from '@/api/questions';
import { getSubjects, getCategories, type Subject, type Category } from '@/api/subjects';

// ---- локал тип: form state ----
interface FixedItem {
  questionId: string;
  text: string;
  pointsOverride: string;
}

interface RuleItem {
  subjectId: string;
  categoryId: string;
  difficulty: DifficultyLevel | '';
  questionCount: string;
  _categories: Category[];
}

interface FormFields {
  title: string;
  description: string;
  timeLimitMinutes: string;
  passingScorePercent: string;
  maxAttempts: string;
  attemptIntervalMinutes: string;
  navigation: NavigationMode;
  resultVisibility: ResultVisibility;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  partialScoring: boolean;
  negativeMarking: boolean;
  negativePoints: string;
  avoidRepeatQuestions: boolean;
  maxTabSwitches: string;
}

interface GradeRow {
  grade: GradeValue | '';
  minPercent: string;
}

const DEFAULTS: FormFields = {
  title: '',
  description: '',
  timeLimitMinutes: '60',
  passingScorePercent: '60',
  maxAttempts: '1',
  attemptIntervalMinutes: '0',
  navigation: 'free',
  resultVisibility: 'immediately_score',
  shuffleQuestions: true,
  shuffleOptions: true,
  partialScoring: false,
  negativeMarking: false,
  negativePoints: '0',
  avoidRepeatQuestions: true,
  maxTabSwitches: '3',
};

const GRADE_LABELS: Record<GradeValue, string> = {
  excellent: uz.templates.gradeExcellent,
  good: uz.templates.gradeGood,
  satisfactory: uz.templates.gradeSatisfactory,
  unsatisfactory: uz.templates.gradeUnsatisfactory,
};

// ---- savol tanlash modali ----
interface PickerProps {
  open: boolean;
  alreadySelected: string[];
  onConfirm: (questions: Question[]) => void;
  onClose: () => void;
}

function QuestionPickerModal({ open, alreadySelected, onConfirm, onClose }: PickerProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState({ subjectId: '', categoryId: '', difficulty: '' });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(alreadySelected));

  useEffect(() => {
    if (!open) return;
    setSelected(new Set(alreadySelected));
    getSubjects()
      .then(setSubjects)
      .catch(() => {});
  }, [open, alreadySelected]);

  useEffect(() => {
    if (!filter.subjectId) {
      setCategories([]);
      return;
    }
    getCategories(filter.subjectId)
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [filter.subjectId]);

  const search = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        subjectId: filter.subjectId || undefined,
        categoryId: filter.categoryId || undefined,
        difficulty: (filter.difficulty as DifficultyLevel) || undefined,
        status: 'active' as const,
      };
      setQuestions(await getQuestions(params));
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (open) void search();
  }, [open, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirm() {
    const picked = questions.filter((q) => selected.has(q.id));
    onConfirm(picked);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={uz.templates.pickerTitle}
      className="max-w-3xl"
      footer={
        <>
          <span className="text-sm text-gray-500">
            {uz.templates.pickerSelected.replace('{count}', String(selected.size))}
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {uz.common.cancel}
          </Button>
          <Button size="sm" onClick={confirm}>
            {uz.templates.pickerConfirm}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Select
            label={uz.questions.subjectLabel}
            value={filter.subjectId}
            onChange={(e) =>
              setFilter((f) => ({ ...f, subjectId: e.target.value, categoryId: '' }))
            }
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
            value={filter.categoryId}
            onChange={(e) => setFilter((f) => ({ ...f, categoryId: e.target.value }))}
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
            value={filter.difficulty}
            onChange={(e) => setFilter((f) => ({ ...f, difficulty: e.target.value }))}
          >
            <option value="">{uz.questions.allDifficulties}</option>
            <option value="easy">{uz.questions.difficultyEasy}</option>
            <option value="medium">{uz.questions.difficultyMedium}</option>
            <option value="hard">{uz.questions.difficultyHard}</option>
          </Select>
        </div>

        <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-200">
          {loading ? (
            <p className="p-4 text-sm text-gray-500">{uz.common.loading}</p>
          ) : questions.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">{uz.questions.emptyText}</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {questions.map((q) => (
                  <tr
                    key={q.id}
                    className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                    onClick={() => toggle(q.id)}
                  >
                    <td className="px-3 py-2 w-8">
                      <input
                        type="checkbox"
                        checked={selected.has(q.id)}
                        onChange={() => toggle(q.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      />
                    </td>
                    <td className="px-3 py-2 text-gray-900 line-clamp-2">{q.text}</td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      {q.difficulty} · {q.points} ball
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ---- asosiy sahifa ----
export function TemplateFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [fields, setFields] = useState<FormFields>(DEFAULTS);
  const [gradeScale, setGradeScale] = useState<GradeRow[]>([]);
  const [fixedItems, setFixedItems] = useState<FixedItem[]>([]);
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [loadingInit, setLoadingInit] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [activating, setActivating] = useState(false);
  const [activateError, setActivateError] = useState<string | null>(null);
  const [shortages, setShortages] = useState<SelectionShortage[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [templateStatus, setTemplateStatus] = useState<string>('draft');

  useEffect(() => {
    getSubjects()
      .then(setAllSubjects)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit || !id) return;
    void (async () => {
      try {
        const t: TestTemplate = await getTemplate(id);
        setTemplateStatus(t.status);
        setFields({
          title: t.title,
          description: t.description ?? '',
          timeLimitMinutes: String(t.timeLimitMinutes),
          passingScorePercent: String(t.passingScorePercent),
          maxAttempts: String(t.maxAttempts),
          attemptIntervalMinutes: String(t.attemptIntervalMinutes),
          navigation: t.navigation,
          resultVisibility: t.resultVisibility,
          shuffleQuestions: t.shuffleQuestions,
          shuffleOptions: t.shuffleOptions,
          partialScoring: t.partialScoring,
          negativeMarking: t.negativeMarking,
          negativePoints: String(t.negativePoints),
          avoidRepeatQuestions: t.avoidRepeatQuestions,
          maxTabSwitches: String(t.maxTabSwitches),
        });
        setGradeScale(
          t.gradeScale.map((g) => ({ grade: g.grade, minPercent: String(g.minPercent) })),
        );
        setRules(
          await Promise.all(
            t.selectionRules.map(async (r) => {
              const cats = await getCategories(r.subjectId).catch(() => []);
              return {
                subjectId: r.subjectId,
                categoryId: r.categoryId ?? '',
                difficulty: (r.difficulty ?? '') as DifficultyLevel | '',
                questionCount: String(r.questionCount),
                _categories: cats,
              };
            }),
          ),
        );
        const texts = await Promise.all(
          t.fixedQuestions
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map(async (fq) => {
              const q = await getQuestion(fq.questionId).catch(() => null);
              return {
                questionId: fq.questionId,
                text: q?.text ?? `Savol #${fq.questionId}`,
                pointsOverride: fq.pointsOverride ?? '',
              };
            }),
        );
        setFixedItems(texts);
      } finally {
        setLoadingInit(false);
      }
    })();
  }, [id, isEdit]);

  function setField<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  // Grade scale helpers
  function addGradeRow() {
    setGradeScale((prev) => [...prev, { grade: '', minPercent: '' }]);
  }
  function updateGradeRow(i: number, patch: Partial<GradeRow>) {
    setGradeScale((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function removeGradeRow(i: number) {
    setGradeScale((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Selection rule helpers
  function addRule() {
    setRules((prev) => [
      ...prev,
      { subjectId: '', categoryId: '', difficulty: '', questionCount: '1', _categories: [] },
    ]);
  }
  function updateRule(i: number, patch: Partial<RuleItem>) {
    setRules((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function removeRule(i: number) {
    setRules((prev) => prev.filter((_, idx) => idx !== i));
  }
  async function onRuleSubjectChange(i: number, subjectId: string) {
    const cats = subjectId ? await getCategories(subjectId).catch(() => []) : [];
    updateRule(i, { subjectId, categoryId: '', _categories: cats });
  }

  // Fixed questions helpers
  function onPickerConfirm(picked: Question[]) {
    setFixedItems((prev) => {
      const existingIds = new Set(prev.map((f) => f.questionId));
      const newItems = picked
        .filter((q) => !existingIds.has(q.id))
        .map((q) => ({ questionId: q.id, text: q.text, pointsOverride: '' }));
      return [...prev, ...newItems];
    });
    setPickerOpen(false);
  }
  function removeFixed(i: number) {
    setFixedItems((prev) => prev.filter((_, idx) => idx !== i));
  }
  function updateFixedOverride(i: number, val: string) {
    setFixedItems((prev) => prev.map((f, idx) => (idx === i ? { ...f, pointsOverride: val } : f)));
  }

  // Build DTO
  function buildDto(): CreateTemplateDto {
    return {
      title: fields.title.trim(),
      description: fields.description.trim() || undefined,
      timeLimitMinutes: Number(fields.timeLimitMinutes),
      passingScorePercent: Number(fields.passingScorePercent),
      maxAttempts: Number(fields.maxAttempts),
      attemptIntervalMinutes: Number(fields.attemptIntervalMinutes),
      navigation: fields.navigation,
      resultVisibility: fields.resultVisibility,
      shuffleQuestions: fields.shuffleQuestions,
      shuffleOptions: fields.shuffleOptions,
      partialScoring: fields.partialScoring,
      negativeMarking: fields.negativeMarking,
      negativePoints: Number(fields.negativePoints),
      avoidRepeatQuestions: fields.avoidRepeatQuestions,
      maxTabSwitches: Number(fields.maxTabSwitches),
      gradeScale: gradeScale
        .filter((g) => g.grade && g.minPercent !== '')
        .map((g) => ({ grade: g.grade as GradeValue, minPercent: Number(g.minPercent) })),
      fixedQuestions: fixedItems.map((f) => ({
        questionId: f.questionId,
        pointsOverride: f.pointsOverride !== '' ? Number(f.pointsOverride) : undefined,
      })),
      selectionRules: rules
        .filter((r) => r.subjectId && r.questionCount)
        .map((r) => ({
          subjectId: r.subjectId,
          categoryId: r.categoryId || undefined,
          difficulty: r.difficulty || undefined,
          questionCount: Number(r.questionCount),
        })),
    };
  }

  async function handleSave() {
    if (!fields.title.trim()) {
      setSaveError('Shablon nomini kiriting');
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      const dto = buildDto();
      if (isEdit && id) {
        await updateTemplate(id, dto);
      } else {
        await createTemplate(dto);
      }
      navigate('/templates');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ??
            err.message)
          : uz.common.error;
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleCheckBank() {
    if (!id) return;
    setChecking(true);
    setShortages(null);
    try {
      const result = await checkTemplateSelection(id);
      setShortages(result);
    } catch {
      setShortages([]);
    } finally {
      setChecking(false);
    }
  }

  async function handleActivate() {
    if (!id) return;
    setActivateError(null);
    setActivating(true);
    try {
      await activateTemplate(id);
      navigate('/templates');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ??
            err.message)
          : uz.templates.activateError;
      setActivateError(msg);
    } finally {
      setActivating(false);
    }
  }

  const isDraft = templateStatus === 'draft';
  const isReadonly = isEdit && templateStatus !== 'draft';

  const totalAuto = rules
    .filter((r) => r.subjectId && r.questionCount)
    .reduce((s, r) => s + Number(r.questionCount || 0), 0);

  if (loadingInit) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-500">
        {uz.common.loading}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sarlavha */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">
          {isEdit ? uz.templates.edit : uz.templates.add}
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigate('/templates')}>
            {uz.common.cancel}
          </Button>
          {!isReadonly && (
            <Button size="sm" loading={saving} onClick={handleSave}>
              {saving ? uz.templates.saving : uz.common.save}
            </Button>
          )}
        </div>
      </div>

      {saveError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      )}

      {isReadonly && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Faol yoki arxivlangan shablon tahrirlanmaydi.
        </div>
      )}

      {/* 1. Asosiy ma'lumot */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">{uz.templates.sectionBasic}</h2>
        <Input
          label={uz.templates.titleLabel}
          placeholder={uz.templates.titlePlaceholder}
          value={fields.title}
          onChange={(e) => setField('title', e.target.value)}
          disabled={isReadonly}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {uz.templates.descriptionLabel}
          </label>
          <textarea
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            rows={2}
            placeholder={uz.templates.descriptionPlaceholder}
            value={fields.description}
            onChange={(e) => setField('description', e.target.value)}
            disabled={isReadonly}
          />
        </div>
      </section>

      {/* 2. Vaqt va urinishlar */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">{uz.templates.sectionTiming}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label={uz.templates.timeLimitLabel}
            type="number"
            min={1}
            max={600}
            value={fields.timeLimitMinutes}
            onChange={(e) => setField('timeLimitMinutes', e.target.value)}
            disabled={isReadonly}
          />
          <Input
            label={uz.templates.maxAttemptsLabel}
            type="number"
            min={1}
            value={fields.maxAttempts}
            onChange={(e) => setField('maxAttempts', e.target.value)}
            disabled={isReadonly}
          />
          <Input
            label={uz.templates.attemptIntervalLabel}
            type="number"
            min={0}
            value={fields.attemptIntervalMinutes}
            onChange={(e) => setField('attemptIntervalMinutes', e.target.value)}
            disabled={isReadonly}
          />
        </div>
      </section>

      {/* 3. Navigatsiya va tartiblash */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">{uz.templates.sectionBehavior}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label={uz.templates.navigationLabel}
            value={fields.navigation}
            onChange={(e) => setField('navigation', e.target.value as NavigationMode)}
            disabled={isReadonly}
          >
            <option value="free">{uz.templates.navigationFree}</option>
            <option value="forward_only">{uz.templates.navigationForwardOnly}</option>
          </Select>
        </div>
        <div className="flex flex-wrap gap-6">
          {(
            [
              ['shuffleQuestions', uz.templates.shuffleQuestionsLabel],
              ['shuffleOptions', uz.templates.shuffleOptionsLabel],
              ['avoidRepeatQuestions', uz.templates.avoidRepeatLabel],
            ] as [keyof FormFields, string][]
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={fields[key] as boolean}
                onChange={(e) => setField(key, e.target.checked)}
                disabled={isReadonly}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              {label}
            </label>
          ))}
        </div>
      </section>

      {/* 4. Baholash */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">{uz.templates.sectionScoring}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={uz.templates.passingScoreLabel}
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={fields.passingScorePercent}
            onChange={(e) => setField('passingScorePercent', e.target.value)}
            disabled={isReadonly}
          />
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={fields.partialScoring}
              onChange={(e) => setField('partialScoring', e.target.checked)}
              disabled={isReadonly}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            {uz.templates.partialScoringLabel}
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={fields.negativeMarking}
              onChange={(e) => setField('negativeMarking', e.target.checked)}
              disabled={isReadonly}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            {uz.templates.negativeMarkingLabel}
          </label>
        </div>
        {fields.negativeMarking && (
          <div className="w-48">
            <Input
              label={uz.templates.negativePointsLabel}
              type="number"
              min={0}
              step={0.01}
              value={fields.negativePoints}
              onChange={(e) => setField('negativePoints', e.target.value)}
              disabled={isReadonly}
            />
          </div>
        )}
      </section>

      {/* 5. Natija va xavfsizlik */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900">{uz.templates.sectionVisibility}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label={uz.templates.resultVisibilityLabel}
            value={fields.resultVisibility}
            onChange={(e) => setField('resultVisibility', e.target.value as ResultVisibility)}
            disabled={isReadonly}
          >
            <option value="immediately_full">{uz.templates.resultImmediatelyFull}</option>
            <option value="immediately_score">{uz.templates.resultImmediatelyScore}</option>
            <option value="hidden">{uz.templates.resultHidden}</option>
          </Select>
          <Input
            label={uz.templates.maxTabSwitchesLabel}
            type="number"
            min={0}
            value={fields.maxTabSwitches}
            onChange={(e) => setField('maxTabSwitches', e.target.value)}
            disabled={isReadonly}
          />
        </div>
      </section>

      {/* 6. Baholash shkalasi */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">{uz.templates.sectionGradeScale}</h2>
          {!isReadonly && (
            <Button variant="secondary" size="sm" onClick={addGradeRow}>
              {uz.templates.gradeScaleAdd}
            </Button>
          )}
        </div>
        {gradeScale.length === 0 ? (
          <p className="text-sm text-gray-500">Baholash shkalasi belgilanmagan (ixtiyoriy)</p>
        ) : (
          <div className="space-y-2">
            {gradeScale.map((row, i) => (
              <div key={i} className="flex items-end gap-3">
                <div className="w-44">
                  <Select
                    label={i === 0 ? uz.templates.gradeScaleGradeLabel : undefined}
                    value={row.grade}
                    onChange={(e) => updateGradeRow(i, { grade: e.target.value as GradeValue })}
                    disabled={isReadonly}
                  >
                    <option value="">Tanlang</option>
                    {(['excellent', 'good', 'satisfactory', 'unsatisfactory'] as GradeValue[]).map(
                      (g) => (
                        <option key={g} value={g}>
                          {GRADE_LABELS[g]}
                        </option>
                      ),
                    )}
                  </Select>
                </div>
                <div className="w-32">
                  <Input
                    label={i === 0 ? uz.templates.gradeScaleMinPercentLabel : undefined}
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={row.minPercent}
                    onChange={(e) => updateGradeRow(i, { minPercent: e.target.value })}
                    disabled={isReadonly}
                  />
                </div>
                {!isReadonly && (
                  <button
                    type="button"
                    onClick={() => removeGradeRow(i)}
                    className="mb-1 text-sm text-red-500 hover:text-red-700"
                    aria-label="O'chirish"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 7. Savollar */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 space-y-6">
        <h2 className="text-lg font-medium text-gray-900">{uz.templates.sectionQuestions}</h2>

        {/* Savol hisob */}
        <p className="text-sm text-gray-500">
          {uz.templates.questionCount
            .replace('{total}', String(fixedItems.length + totalAuto))
            .replace('{fixed}', String(fixedItems.length))
            .replace('{auto}', String(totalAuto))}
        </p>

        {/* Qo'lda tanlangan savollar */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">
              {uz.templates.fixedQuestionsTitle}
            </h3>
            {!isReadonly && (
              <Button variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
                {uz.templates.fixedQuestionsAdd}
              </Button>
            )}
          </div>
          {fixedItems.length === 0 ? (
            <p className="text-sm text-gray-400">{uz.templates.fixedQuestionsEmpty}</p>
          ) : (
            <div className="space-y-2">
              {fixedItems.map((f, i) => (
                <div
                  key={f.questionId}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                >
                  <span className="text-xs text-gray-400 w-5 shrink-0">{i + 1}.</span>
                  <span className="flex-1 text-sm text-gray-800 line-clamp-1">{f.text}</span>
                  <div className="w-28 shrink-0">
                    <input
                      type="number"
                      min={0.01}
                      step={0.01}
                      placeholder="Ball (ixtiyoriy)"
                      value={f.pointsOverride}
                      onChange={(e) => updateFixedOverride(i, e.target.value)}
                      disabled={isReadonly}
                      className="block w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  {!isReadonly && (
                    <button
                      type="button"
                      onClick={() => removeFixed(i)}
                      className="text-xs text-red-500 hover:text-red-700 shrink-0"
                      aria-label="O'chirish"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Avtomatik tanlash qoidalari */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">
              {uz.templates.selectionRulesTitle}
            </h3>
            {!isReadonly && (
              <Button variant="secondary" size="sm" onClick={addRule}>
                {uz.templates.selectionRuleAdd}
              </Button>
            )}
          </div>
          {rules.length === 0 ? (
            <p className="text-sm text-gray-400">{uz.templates.selectionRuleEmpty}</p>
          ) : (
            <div className="space-y-3">
              {rules.map((rule, i) => (
                <div
                  key={i}
                  className="grid grid-cols-2 gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 sm:grid-cols-4"
                >
                  <Select
                    label={i === 0 ? uz.templates.selectionSubjectLabel : undefined}
                    value={rule.subjectId}
                    onChange={(e) => onRuleSubjectChange(i, e.target.value)}
                    disabled={isReadonly}
                  >
                    <option value="">Fan tanlang</option>
                    {allSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label={i === 0 ? uz.templates.selectionCategoryLabel : undefined}
                    value={rule.categoryId}
                    onChange={(e) => updateRule(i, { categoryId: e.target.value })}
                    disabled={isReadonly || !rule.subjectId}
                  >
                    <option value="">{uz.templates.selectionAllCategories}</option>
                    {rule._categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    label={i === 0 ? uz.templates.selectionDifficultyLabel : undefined}
                    value={rule.difficulty}
                    onChange={(e) =>
                      updateRule(i, { difficulty: e.target.value as DifficultyLevel | '' })
                    }
                    disabled={isReadonly}
                  >
                    <option value="">{uz.templates.selectionAllDifficulties}</option>
                    <option value="easy">{uz.questions.difficultyEasy}</option>
                    <option value="medium">{uz.questions.difficultyMedium}</option>
                    <option value="hard">{uz.questions.difficultyHard}</option>
                  </Select>
                  <div className="flex items-end gap-2">
                    <Input
                      label={i === 0 ? uz.templates.selectionCountLabel : undefined}
                      type="number"
                      min={1}
                      value={rule.questionCount}
                      onChange={(e) => updateRule(i, { questionCount: e.target.value })}
                      disabled={isReadonly}
                    />
                    {!isReadonly && (
                      <button
                        type="button"
                        onClick={() => removeRule(i)}
                        className="mb-1 text-sm text-red-500 hover:text-red-700 shrink-0"
                        aria-label="O'chirish"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Faollashtirish (faqat draft, faqat tahrirlash rejimi) */}
      {isEdit && isDraft && (
        <section className="rounded-lg border border-blue-100 bg-blue-50 p-6 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">{uz.templates.activate}</h2>
          <p className="text-sm text-gray-600">
            Faollashtirishdan avval bank tekshiruvi o'tkazish tavsiya etiladi.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" size="sm" loading={checking} onClick={handleCheckBank}>
              {checking ? uz.templates.checking : uz.templates.checkBank}
            </Button>
            <Button size="sm" loading={activating} onClick={handleActivate}>
              {activating ? uz.templates.activating : uz.templates.activate}
            </Button>
          </div>

          {activateError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {activateError}
            </div>
          )}

          {shortages !== null && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                shortages.length === 0
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-yellow-200 bg-yellow-50 text-yellow-800'
              }`}
            >
              {shortages.length === 0 ? (
                uz.templates.bankOk
              ) : (
                <div className="space-y-1">
                  <p className="font-medium">{uz.templates.bankShortageTitle}</p>
                  {shortages.map((s, i) => (
                    <p key={i}>
                      {uz.templates.bankShortageRule.replace('{index}', String(s.ruleIndex + 1))}
                      {s.categoryId ? ` (kategoriya ${s.categoryId})` : ''}
                      {s.difficulty ? ` · ${s.difficulty}` : ''} —{' '}
                      {uz.templates.bankShortageDetail
                        .replace('{available}', String(s.available))
                        .replace('{requested}', String(s.requested))
                        .replace('{missing}', String(s.missing))}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <QuestionPickerModal
        open={pickerOpen}
        alreadySelected={fixedItems.map((f) => f.questionId)}
        onConfirm={onPickerConfirm}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
