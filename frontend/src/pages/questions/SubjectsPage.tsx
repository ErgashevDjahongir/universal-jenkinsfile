import { useState, useEffect, useCallback } from 'react';
import { Pencil, Plus, Save, X } from 'lucide-react';
import { Button, Input, Modal, Badge, DataState, PageHeader } from '@/components/ui';
import { uz } from '@/i18n/uz';
import {
  getSubjects,
  createSubject,
  updateSubject,
  getCategories,
  createCategory,
  updateCategory,
  type Subject,
  type Category,
} from '@/api/subjects';

interface SubjectFormData {
  name: string;
  description: string;
  isActive: boolean;
}

interface CategoryFormData {
  name: string;
  parentId: string;
}

export function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);

  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catsLoading, setCatsLoading] = useState(false);
  const [catsError, setCatsError] = useState<string | null>(null);

  const [subjectModal, setSubjectModal] = useState<{ open: boolean; editing: Subject | null }>({
    open: false,
    editing: null,
  });
  const [subjectForm, setSubjectForm] = useState<SubjectFormData>({
    name: '',
    description: '',
    isActive: true,
  });
  const [subjectSaving, setSubjectSaving] = useState(false);

  const [categoryModal, setCategoryModal] = useState<{ open: boolean; editing: Category | null }>({
    open: false,
    editing: null,
  });
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>({ name: '', parentId: '' });
  const [categorySaving, setCategorySaving] = useState(false);

  const loadSubjects = useCallback(async () => {
    setSubjectsLoading(true);
    setSubjectsError(null);
    try {
      setSubjects(await getSubjects());
    } catch {
      setSubjectsError(uz.common.error);
    } finally {
      setSubjectsLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async (subjectId: string) => {
    setCatsLoading(true);
    setCatsError(null);
    try {
      setCategories(await getCategories(subjectId));
    } catch {
      setCatsError(uz.common.error);
    } finally {
      setCatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSubjects();
  }, [loadSubjects]);

  function openAddSubject() {
    setSubjectForm({ name: '', description: '', isActive: true });
    setSubjectModal({ open: true, editing: null });
  }

  function openEditSubject(s: Subject) {
    setSubjectForm({ name: s.name, description: s.description ?? '', isActive: s.isActive });
    setSubjectModal({ open: true, editing: s });
  }

  async function saveSubject() {
    if (!subjectForm.name.trim()) return;
    setSubjectSaving(true);
    try {
      const dto = {
        name: subjectForm.name.trim(),
        description: subjectForm.description.trim() || undefined,
      };
      if (subjectModal.editing) {
        const updated = await updateSubject(subjectModal.editing.id, {
          ...dto,
          isActive: subjectForm.isActive,
        });
        setSubjects((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        if (selectedSubject?.id === updated.id) setSelectedSubject(updated);
      } else {
        const created = await createSubject(dto);
        setSubjects((prev) => [...prev, created]);
      }
      setSubjectModal({ open: false, editing: null });
    } catch {
      // xato modal ichida ko'rinadi (future improvement)
    } finally {
      setSubjectSaving(false);
    }
  }

  function selectSubject(s: Subject) {
    setSelectedSubject(s);
    void loadCategories(s.id);
  }

  function openAddCategory() {
    setCategoryForm({ name: '', parentId: '' });
    setCategoryModal({ open: true, editing: null });
  }

  function openEditCategory(c: Category) {
    setCategoryForm({ name: c.name, parentId: c.parentId ?? '' });
    setCategoryModal({ open: true, editing: c });
  }

  async function saveCategory() {
    if (!categoryForm.name.trim() || !selectedSubject) return;
    setCategorySaving(true);
    try {
      if (categoryModal.editing) {
        const updated = await updateCategory(categoryModal.editing.id, {
          name: categoryForm.name.trim(),
        });
        setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await createCategory({
          subjectId: selectedSubject.id,
          name: categoryForm.name.trim(),
          parentId: categoryForm.parentId || undefined,
        });
        setCategories((prev) => [...prev, created]);
      }
      setCategoryModal({ open: false, editing: null });
    } catch {
      // future: show inline error
    } finally {
      setCategorySaving(false);
    }
  }

  const topCategories = categories.filter((c) => !c.parentId);
  const childrenOf = (parentId: string) => categories.filter((c) => c.parentId === parentId);

  return (
    <div className="space-y-6">
      <PageHeader title={uz.subjects.title} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Fanlar paneli */}
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <span className="text-sm font-medium text-gray-700">{uz.subjects.title}</span>
            <Button
              size="icon"
              title={uz.subjects.add}
              aria-label={uz.subjects.add}
              onClick={openAddSubject}
            >
              <Plus size={16} />
            </Button>
          </div>
          <DataState
            loading={subjectsLoading}
            error={subjectsError}
            isEmpty={subjects.length === 0}
            emptyText={uz.subjects.emptyText}
            onRetry={loadSubjects}
            emptyAction={
              <Button
                size="icon"
                title={uz.subjects.add}
                aria-label={uz.subjects.add}
                onClick={openAddSubject}
              >
                <Plus size={16} />
              </Button>
            }
          >
            <ul className="divide-y divide-gray-100">
              {subjects.map((s) => (
                <li
                  key={s.id}
                  onClick={() => selectSubject(s)}
                  className={`flex cursor-pointer items-center justify-between px-4 py-3 transition-colors hover:bg-gray-50 ${selectedSubject?.id === s.id ? 'bg-blue-50' : ''}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{s.name}</p>
                    {s.description && (
                      <p className="truncate text-xs text-gray-500">{s.description}</p>
                    )}
                  </div>
                  <div className="ml-2 flex shrink-0 items-center gap-2">
                    <Badge variant={s.isActive ? 'success' : 'neutral'}>
                      {s.isActive ? 'Faol' : 'Nofaol'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={uz.common.edit}
                      aria-label={uz.common.edit}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditSubject(s);
                      }}
                    >
                      <Pencil size={15} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </DataState>
        </div>

        {/* Kategoriyalar paneli */}
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <span className="text-sm font-medium text-gray-700">
              {selectedSubject ? selectedSubject.name + ' — ' : ''}
              {uz.subjects.categories}
            </span>
            {selectedSubject && (
              <Button
                size="icon"
                title={uz.categories.add}
                aria-label={uz.categories.add}
                onClick={openAddCategory}
              >
                <Plus size={16} />
              </Button>
            )}
          </div>

          {!selectedSubject ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-gray-400">{uz.categories.selectSubject}</p>
            </div>
          ) : (
            <DataState
              loading={catsLoading}
              error={catsError}
              isEmpty={categories.length === 0}
              emptyText={uz.categories.emptyText}
              onRetry={() => loadCategories(selectedSubject.id)}
              emptyAction={
                <Button
                  size="icon"
                  title={uz.categories.add}
                  aria-label={uz.categories.add}
                  onClick={openAddCategory}
                >
                  <Plus size={16} />
                </Button>
              }
            >
              <ul className="divide-y divide-gray-100">
                {topCategories.map((cat) => (
                  <CategoryRow
                    key={cat.id}
                    category={cat}
                    children={childrenOf(cat.id)}
                    grandchildren={childrenOf}
                    onEdit={openEditCategory}
                  />
                ))}
              </ul>
            </DataState>
          )}
        </div>
      </div>

      {/* Fan modali */}
      <Modal
        open={subjectModal.open}
        onClose={() => setSubjectModal({ open: false, editing: null })}
        title={subjectModal.editing ? uz.subjects.edit : uz.subjects.add}
        footer={
          <>
            <Button
              variant="secondary"
              size="icon"
              title={uz.common.cancel}
              aria-label={uz.common.cancel}
              onClick={() => setSubjectModal({ open: false, editing: null })}
            >
              <X size={16} />
            </Button>
            <Button
              size="icon"
              title={uz.common.save}
              aria-label={uz.common.save}
              loading={subjectSaving}
              onClick={() => void saveSubject()}
            >
              <Save size={16} />
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={uz.subjects.nameLabel}
            placeholder={uz.subjects.namePlaceholder}
            value={subjectForm.name}
            onChange={(e) => setSubjectForm((f) => ({ ...f, name: e.target.value }))}
            autoFocus
          />
          <Input
            label={uz.subjects.descriptionLabel}
            placeholder={uz.subjects.descriptionPlaceholder}
            value={subjectForm.description}
            onChange={(e) => setSubjectForm((f) => ({ ...f, description: e.target.value }))}
          />
          {subjectModal.editing && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={subjectForm.isActive}
                onChange={(e) => setSubjectForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="rounded border-gray-300"
              />
              {uz.subjects.activeLabel}
            </label>
          )}
        </div>
      </Modal>

      {/* Kategoriya modali */}
      <Modal
        open={categoryModal.open}
        onClose={() => setCategoryModal({ open: false, editing: null })}
        title={categoryModal.editing ? uz.categories.edit : uz.categories.add}
        footer={
          <>
            <Button
              variant="secondary"
              size="icon"
              title={uz.common.cancel}
              aria-label={uz.common.cancel}
              onClick={() => setCategoryModal({ open: false, editing: null })}
            >
              <X size={16} />
            </Button>
            <Button
              size="icon"
              title={uz.common.save}
              aria-label={uz.common.save}
              loading={categorySaving}
              onClick={() => void saveCategory()}
            >
              <Save size={16} />
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={uz.categories.nameLabel}
            placeholder={uz.categories.namePlaceholder}
            value={categoryForm.name}
            onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))}
            autoFocus
          />
          {!categoryModal.editing && (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                {uz.categories.parentLabel}
              </label>
              <select
                value={categoryForm.parentId}
                onChange={(e) => setCategoryForm((f) => ({ ...f, parentId: e.target.value }))}
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="">{uz.categories.parentNone}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

function CategoryRow({
  category,
  children,
  grandchildren,
  onEdit,
  depth = 0,
}: {
  category: Category;
  children: Category[];
  grandchildren: (parentId: string) => Category[];
  onEdit: (c: Category) => void;
  depth?: number;
}) {
  return (
    <>
      <li className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
        <div className="flex items-center gap-2 min-w-0">
          {depth > 0 && (
            <span className="text-gray-300" style={{ paddingLeft: `${depth * 12}px` }}>
              └
            </span>
          )}
          <span className="truncate text-sm text-gray-800">{category.name}</span>
          {!category.isActive && (
            <Badge variant="neutral" className="shrink-0">
              Nofaol
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          title={uz.common.edit}
          aria-label={uz.common.edit}
          onClick={() => onEdit(category)}
        >
          <Pencil size={15} />
        </Button>
      </li>
      {children.map((child) => (
        <CategoryRow
          key={child.id}
          category={child}
          children={grandchildren(child.id)}
          grandchildren={grandchildren}
          onEdit={onEdit}
          depth={depth + 1}
        />
      ))}
    </>
  );
}
