import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Archive,
  ArrowLeft,
  CheckCircle,
  ImagePlus,
  Plus,
  Power,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { Button, Input, Modal, Select, Badge, PageHeader, RichTextEditor } from '@/components/ui';
import { sanitizeHtml, isHtmlEmpty } from '@/lib/sanitize';
import { uz } from '@/i18n/uz';
import { useAuth } from '@/auth/useAuth';
import { UserRole } from '@/auth/roles';
import { getSubjects, getCategories, type Subject, type Category } from '@/api/subjects';
import {
  getQuestion,
  createQuestion,
  updateQuestion,
  approveQuestion,
  activateQuestion,
  archiveQuestion,
  uploadAttachment,
  getAttachments,
  type Question,
  type QuestionType,
  type DifficultyLevel,
  type QuestionOptionDto,
  type QuestionAttachment,
} from '@/api/questions';

interface OptionRow {
  text: string;
  isCorrect: boolean;
  orderIndex: number;
  matchPair: string;
}

function defaultOptions(type: QuestionType): OptionRow[] {
  if (type === 'true_false') {
    return [
      { text: uz.questions.trueOption, isCorrect: true, orderIndex: 0, matchPair: '' },
      { text: uz.questions.falseOption, isCorrect: false, orderIndex: 1, matchPair: '' },
    ];
  }
  if (type === 'short_answer') return [];
  return [
    { text: '', isCorrect: false, orderIndex: 0, matchPair: '' },
    { text: '', isCorrect: false, orderIndex: 1, matchPair: '' },
  ];
}

function optionRowsFromQuestion(q: Question): OptionRow[] {
  if (q.type === 'short_answer') return [];
  return [...q.options]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((o) => ({
      text: o.text,
      isCorrect: o.isCorrect,
      orderIndex: o.orderIndex,
      matchPair: o.matchPair ?? '',
    }));
}

function buildOptionDtos(type: QuestionType, options: OptionRow[]): QuestionOptionDto[] {
  return options.map((o, i) => ({
    text: o.text,
    isCorrect: type !== 'ordering' ? o.isCorrect : undefined,
    orderIndex: i,
    matchPair: type === 'matching' ? o.matchPair || undefined : undefined,
  }));
}

export function QuestionFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN;

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [subjectId, setSubjectId] = useState('');
  const [type, setType] = useState<QuestionType>('single_choice');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [text, setText] = useState('');
  const [points, setPoints] = useState('');
  const [explanation, setExplanation] = useState('');
  const [answerKey, setAnswerKey] = useState('');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [options, setOptions] = useState<OptionRow[]>(defaultOptions('single_choice'));

  const [question, setQuestion] = useState<Question | null>(null);
  const [attachments, setAttachments] = useState<QuestionAttachment[]>([]);
  const [loadingQ, setLoadingQ] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSubjects()
      .then(setSubjects)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!subjectId) {
      setCategories([]);
      return;
    }
    getCategories(subjectId)
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [subjectId]);

  const loadQuestion = useCallback(async () => {
    if (!id) return;
    setLoadingQ(true);
    try {
      const q = await getQuestion(id);
      setQuestion(q);
      setSubjectId(q.subjectId);
      setType(q.type);
      setDifficulty(q.difficulty);
      setText(q.text);
      setPoints(q.points);
      setExplanation(q.explanation ?? '');
      setAnswerKey(q.answerKey ?? '');
      setSelectedCategoryIds(q.categories.map((c) => c.id));
      setOptions(optionRowsFromQuestion(q));

      const atts = await getAttachments(id);
      setAttachments(atts);
    } catch {
      // show error state
    } finally {
      setLoadingQ(false);
    }
  }, [id]);

  useEffect(() => {
    void loadQuestion();
  }, [loadQuestion]);

  function handleTypeChange(newType: QuestionType) {
    setType(newType);
    setOptions(defaultOptions(newType));
    if (newType !== 'short_answer') setAnswerKey('');
  }

  function addOption() {
    setOptions((prev) => [
      ...prev,
      { text: '', isCorrect: false, orderIndex: prev.length, matchPair: '' },
    ]);
  }

  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateOption(index: number, field: keyof OptionRow, value: string | boolean | number) {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, [field]: value } : o)));
  }

  function setSingleCorrect(index: number) {
    setOptions((prev) => prev.map((o, i) => ({ ...o, isCorrect: i === index })));
  }

  function toggleMultiCorrect(index: number) {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, isCorrect: !o.isCorrect } : o)));
  }

  function toggleCategory(catId: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId],
    );
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!subjectId) errs.subjectId = 'Yoʼnalish tanlanishi shart';
    if (isHtmlEmpty(text)) errs.text = 'Savol matni kiritilishi shart';
    if (type !== 'short_answer' && options.some((o) => !o.text.trim())) {
      errs.options = "Barcha variantlar to'g'rilanishi shart";
    }
    if (
      (type === 'single_choice' || type === 'multiple_choice' || type === 'true_false') &&
      !options.some((o) => o.isCorrect)
    ) {
      errs.options = "Kamida bitta to'g'ri javob belgilanishi shart";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const dto = {
        subjectId,
        type,
        difficulty,
        text: sanitizeHtml(text),
        points: points ? parseFloat(points) : undefined,
        explanation: explanation.trim() || undefined,
        answerKey: type === 'short_answer' ? answerKey.trim() || undefined : undefined,
        categoryIds: selectedCategoryIds.length ? selectedCategoryIds : undefined,
        options: type !== 'short_answer' ? buildOptionDtos(type, options) : undefined,
      };
      if (isEdit && id) {
        const updated = await updateQuestion(id, dto);
        setQuestion(updated);
        setOptions(optionRowsFromQuestion(updated));
      } else {
        const created = await createQuestion(dto);
        navigate(`/questions/${created.id}/edit`, { replace: true });
      }
    } catch {
      setErrors({ global: uz.common.error });
    } finally {
      setSaving(false);
    }
  }

  async function handleTransition(action: 'approve' | 'activate' | 'archive') {
    if (!id) return;
    setTransitioning(true);
    try {
      let updated: Question;
      if (action === 'approve') updated = await approveQuestion(id);
      else if (action === 'activate') updated = await activateQuestion(id);
      else updated = await archiveQuestion(id);
      setQuestion(updated);
    } catch {
      setErrors({ global: uz.common.error });
    } finally {
      setTransitioning(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploading(true);
    try {
      const att = await uploadAttachment(id, file);
      setAttachments((prev) => [...prev, att]);
    } catch {
      setErrors({ upload: 'Rasm yuklashda xatolik yuz berdi' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  if (loadingQ) {
    return (
      <div className="space-y-3 p-6" aria-busy="true">
        <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
        <div className="h-4 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  const canApprove = isAdmin && question?.status === 'draft';
  const canActivate = isAdmin && question?.status === 'approved';
  const canArchive = isAdmin && question?.status === 'active';
  const isArchived = question?.status === 'archived';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={isEdit ? uz.questions.edit : uz.questions.add}
        actions={
          <Button
            variant="secondary"
            size="icon"
            title={uz.common.back}
            aria-label={uz.common.back}
            onClick={() => navigate('/questions')}
          >
            <ArrowLeft size={16} />
          </Button>
        }
      />

      {errors.global && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400">
          {errors.global}
        </p>
      )}

      {/* Holat va o'tishlar */}
      {question && (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {uz.questions.statusLabel}:
          </span>
          <Badge
            variant={
              question.status === 'active'
                ? 'success'
                : question.status === 'approved'
                  ? 'warning'
                  : question.status === 'archived'
                    ? 'danger'
                    : 'neutral'
            }
          >
            {
              uz.questions[
                `status${question.status.charAt(0).toUpperCase() + question.status.slice(1)}` as
                  | 'statusDraft'
                  | 'statusApproved'
                  | 'statusActive'
                  | 'statusArchived'
              ]
            }
          </Badge>
          {canApprove && (
            <Button
              size="icon"
              variant="secondary"
              title={uz.questions.approve}
              aria-label={uz.questions.approve}
              loading={transitioning}
              onClick={() => void handleTransition('approve')}
            >
              <CheckCircle size={15} />
            </Button>
          )}
          {canActivate && (
            <Button
              size="icon"
              title={uz.questions.activate}
              aria-label={uz.questions.activate}
              loading={transitioning}
              onClick={() => void handleTransition('activate')}
            >
              <Power size={15} />
            </Button>
          )}
          {canArchive && (
            <Button
              size="icon"
              variant="danger"
              title={uz.questions.archive}
              aria-label={uz.questions.archive}
              loading={transitioning}
              onClick={() => setArchiveConfirm(true)}
            >
              <Archive size={15} />
            </Button>
          )}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="space-y-5">
          {/* Fan */}
          <Select
            label={uz.questions.subjectLabel}
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setSelectedCategoryIds([]);
            }}
            disabled={isArchived}
            error={errors.subjectId}
          >
            <option value="">— Yoʼnalish tanlang —</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>

          {/* Tur va qiyinlik */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label={uz.questions.typeLabel}
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
              disabled={isEdit || isArchived}
            >
              <option value="single_choice">{uz.questions.typeSingleChoice}</option>
              <option value="multiple_choice">{uz.questions.typeMultipleChoice}</option>
              <option value="true_false">{uz.questions.typeTrueFalse}</option>
              <option value="matching">{uz.questions.typeMatching}</option>
              <option value="ordering">{uz.questions.typeOrdering}</option>
              <option value="short_answer">{uz.questions.typeShortAnswer}</option>
            </Select>

            <Select
              label={uz.questions.difficultyLabel}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
              disabled={isArchived}
            >
              <option value="easy">{uz.questions.difficultyEasy}</option>
              <option value="medium">{uz.questions.difficultyMedium}</option>
              <option value="hard">{uz.questions.difficultyHard}</option>
            </Select>
          </div>

          {/* Savol matni */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {uz.questions.textLabel}
            </label>
            <RichTextEditor
              value={text}
              onChange={setText}
              placeholder={uz.questions.textPlaceholder}
              disabled={isArchived}
              minRows={3}
            />
            {errors.text && <p className="text-sm text-red-600">{errors.text}</p>}
          </div>

          {/* Ball va tushuntirish */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label={uz.questions.pointsLabel}
              type="number"
              min="0.01"
              step="0.5"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="Standart (qiyinlikka qarab)"
              disabled={isArchived}
            />
            <Input
              label={uz.questions.explanationLabel}
              placeholder={uz.questions.explanationPlaceholder}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              disabled={isArchived}
            />
          </div>

          {/* Kategoriyalar */}
          {categories.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {uz.questions.categoriesLabel}
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={isArchived}
                    onClick={() => toggleCategory(c.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      selectedCategoryIds.includes(c.id)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Javob variantlari (tur bo'yicha) */}
          {type !== 'short_answer' && (
            <OptionsEditor
              type={type}
              options={options}
              disabled={isArchived}
              error={errors.options}
              onAdd={addOption}
              onRemove={removeOption}
              onUpdate={updateOption}
              onSetSingleCorrect={setSingleCorrect}
              onToggleMultiCorrect={toggleMultiCorrect}
            />
          )}

          {/* short_answer — qisqa javob kalit */}
          {type === 'short_answer' && (
            <Input
              label={uz.questions.answerKeyLabel}
              placeholder={uz.questions.answerKeyPlaceholder}
              value={answerKey}
              onChange={(e) => setAnswerKey(e.target.value)}
              disabled={isArchived}
            />
          )}
        </div>

        {!isArchived && (
          <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
            <Button
              variant="secondary"
              size="icon"
              title={uz.common.cancel}
              aria-label={uz.common.cancel}
              onClick={() => navigate('/questions')}
            >
              <X size={16} />
            </Button>
            <Button
              size="icon"
              title={uz.common.save}
              aria-label={uz.common.save}
              loading={saving}
              onClick={() => void handleSave()}
            >
              <Save size={16} />
            </Button>
          </div>
        )}
      </div>

      {/* Rasm biriktirish (faqat tahrirlash rejimida) */}
      {isEdit && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-base font-medium text-gray-900 dark:text-gray-100">
            {uz.questions.attachments}
          </h2>

          {attachments.length === 0 ? (
            <p className="mb-4 text-sm text-gray-400 dark:text-gray-500">
              {uz.questions.noAttachments}
            </p>
          ) : (
            <div className="mb-4 flex flex-wrap gap-3">
              {attachments.map((att) => (
                <img
                  key={att.id}
                  src={`/api/uploads/questions/${att.filePath.split('/').pop()}`}
                  alt="Savol rasmi"
                  className="h-24 w-24 rounded-lg border border-gray-200 object-cover dark:border-gray-700"
                />
              ))}
            </div>
          )}

          {!isArchived && (
            <div className="flex items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => void handleUpload(e)}
              />
              <Button
                variant="secondary"
                size="icon"
                title={uz.questions.uploadImage}
                aria-label={uz.questions.uploadImage}
                loading={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus size={16} />
              </Button>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {uz.questions.uploadImageHint}
              </span>
              {errors.upload && <span className="text-xs text-red-600">{errors.upload}</span>}
            </div>
          )}
        </div>
      )}

      <Modal
        open={archiveConfirm}
        onClose={() => setArchiveConfirm(false)}
        title={uz.questions.archive}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setArchiveConfirm(false)}>
              <X size={14} /> {uz.common.cancel}
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={transitioning}
              onClick={() => {
                setArchiveConfirm(false);
                void handleTransition('archive');
              }}
            >
              <Archive size={14} /> {uz.questions.archive}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700 dark:text-gray-300">{uz.templates.archiving}</p>
      </Modal>
    </div>
  );
}

interface OptionsEditorProps {
  type: QuestionType;
  options: OptionRow[];
  disabled: boolean;
  error?: string;
  onAdd: () => void;
  onRemove: (i: number) => void;
  onUpdate: (i: number, field: keyof OptionRow, value: string | boolean | number) => void;
  onSetSingleCorrect: (i: number) => void;
  onToggleMultiCorrect: (i: number) => void;
}

function OptionsEditor({
  type,
  options,
  disabled,
  error,
  onAdd,
  onRemove,
  onUpdate,
  onSetSingleCorrect,
  onToggleMultiCorrect,
}: OptionsEditorProps) {
  const showCorrect =
    type === 'single_choice' || type === 'multiple_choice' || type === 'true_false';
  const showMatchPair = type === 'matching';
  const showOrder = type === 'ordering';
  const isTrueFalse = type === 'true_false';
  const canAdd = !isTrueFalse && !disabled;
  const canRemove = !isTrueFalse && options.length > 2 && !disabled;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {uz.questions.optionsLabel}
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-start gap-2">
            {/* Correct marker */}
            {showCorrect && (
              <button
                type="button"
                disabled={disabled || isTrueFalse}
                aria-label={uz.questions.isCorrect}
                onClick={() =>
                  type === 'multiple_choice' ? onToggleMultiCorrect(i) : onSetSingleCorrect(i)
                }
                className={`mt-2 h-4 w-4 shrink-0 rounded-full border-2 transition-colors ${
                  opt.isCorrect
                    ? 'border-green-600 bg-green-600'
                    : 'border-gray-300 bg-white hover:border-green-400 dark:border-gray-500 dark:bg-gray-700 dark:hover:border-green-400'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              />
            )}

            {/* Order index for ordering type */}
            {showOrder && (
              <input
                type="number"
                min={1}
                value={opt.orderIndex + 1}
                disabled={disabled}
                onChange={(e) => onUpdate(i, 'orderIndex', parseInt(e.target.value, 10) - 1)}
                className="mt-1.5 w-12 rounded border border-gray-300 px-2 py-1.5 text-xs text-gray-700 focus:border-blue-500 focus:outline-none disabled:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:disabled:bg-gray-800"
                aria-label={uz.questions.orderIndexLabel}
              />
            )}

            {/* Option text */}
            <input
              type="text"
              value={opt.text}
              disabled={disabled || isTrueFalse}
              onChange={(e) => onUpdate(i, 'text', e.target.value)}
              placeholder={`${i + 1}-variant`}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
            />

            {/* Match pair */}
            {showMatchPair && (
              <input
                type="text"
                value={opt.matchPair}
                disabled={disabled}
                onChange={(e) => onUpdate(i, 'matchPair', e.target.value)}
                placeholder={uz.questions.matchPairLabel}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-400 dark:disabled:bg-gray-800"
              />
            )}

            {/* Remove */}
            {canRemove && (
              <button
                type="button"
                onClick={() => onRemove(i)}
                title={uz.common.delete}
                aria-label={uz.common.delete}
                className="mt-2 text-gray-400 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {canAdd && (
        <Button
          variant="ghost"
          size="icon"
          title={uz.questions.addOption}
          aria-label={uz.questions.addOption}
          onClick={onAdd}
          className="mt-1"
        >
          <Plus size={15} />
        </Button>
      )}
    </div>
  );
}
