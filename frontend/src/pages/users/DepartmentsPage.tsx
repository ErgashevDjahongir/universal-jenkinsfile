import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { Button, Input, Modal, PageHeader, Select, Table, type Column } from '@/components/ui';
import { uz } from '@/i18n/uz';
import {
  createDepartment,
  createPosition,
  deleteDepartment,
  deletePosition,
  getDepartments,
  getPositions,
  updateDepartment,
  updatePosition,
  type Department,
  type Position,
} from '@/api/departments';

type Tab = 'departments' | 'positions';

export function DepartmentsPage() {
  const [tab, setTab] = useState<Tab>('departments');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // dept form
  const [deptForm, setDeptForm] = useState(false);
  const [deptEdit, setDeptEdit] = useState<Department | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptParent, setDeptParent] = useState('');
  const [deptSaving, setDeptSaving] = useState(false);
  const [deptFormErr, setDeptFormErr] = useState<string | null>(null);
  const [deptDeleteConfirm, setDeptDeleteConfirm] = useState<Department | null>(null);

  // pos form
  const [posForm, setPosForm] = useState(false);
  const [posEdit, setPosEdit] = useState<Position | null>(null);
  const [posName, setPosName] = useState('');
  const [posDept, setPosDept] = useState('');
  const [posSaving, setPosSaving] = useState(false);
  const [posFormErr, setPosFormErr] = useState<string | null>(null);
  const [posDeleteConfirm, setPosDeleteConfirm] = useState<Position | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [deptsData, posData] = await Promise.all([getDepartments(), getPositions()]);
      setDepartments(deptsData);
      setPositions(posData);
    } catch {
      setError(uz.common.error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function parentName(id: string | null) {
    if (!id) return '—';
    return departments.find((d) => d.id === id)?.name ?? '—';
  }

  function deptLabel(id: string | null) {
    if (!id) return uz.positions.departmentAll;
    return departments.find((d) => d.id === id)?.name ?? '—';
  }

  function openDeptForm(dept: Department | null) {
    setDeptEdit(dept);
    setDeptName(dept?.name ?? '');
    setDeptParent(dept?.parentId ?? '');
    setDeptFormErr(null);
    setDeptForm(true);
  }

  async function saveDept(e: React.FormEvent) {
    e.preventDefault();
    if (!deptName.trim()) {
      setDeptFormErr('Nom kiritilishi shart');
      return;
    }
    setDeptSaving(true);
    setDeptFormErr(null);
    try {
      const dto = { name: deptName.trim(), parentId: deptParent || undefined };
      if (deptEdit) {
        const updated = await updateDepartment(deptEdit.id, dto);
        setDepartments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      } else {
        const created = await createDepartment(dto);
        setDepartments((prev) => [...prev, created]);
      }
      setDeptForm(false);
    } catch {
      setDeptFormErr(uz.common.error);
    } finally {
      setDeptSaving(false);
    }
  }

  async function deleteDept() {
    if (!deptDeleteConfirm) return;
    try {
      await deleteDepartment(deptDeleteConfirm.id);
      setDepartments((prev) => prev.filter((d) => d.id !== deptDeleteConfirm.id));
    } catch {
      setError(uz.common.error);
    } finally {
      setDeptDeleteConfirm(null);
    }
  }

  function openPosForm(pos: Position | null) {
    setPosEdit(pos);
    setPosName(pos?.name ?? '');
    setPosDept(pos?.departmentId ?? '');
    setPosFormErr(null);
    setPosForm(true);
  }

  async function savePos(e: React.FormEvent) {
    e.preventDefault();
    if (!posName.trim()) {
      setPosFormErr('Nom kiritilishi shart');
      return;
    }
    setPosSaving(true);
    setPosFormErr(null);
    try {
      const dto = { name: posName.trim(), departmentId: posDept || undefined };
      if (posEdit) {
        const updated = await updatePosition(posEdit.id, dto);
        setPositions((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const created = await createPosition(dto);
        setPositions((prev) => [...prev, created]);
      }
      setPosForm(false);
    } catch {
      setPosFormErr(uz.common.error);
    } finally {
      setPosSaving(false);
    }
  }

  async function deletePos() {
    if (!posDeleteConfirm) return;
    try {
      await deletePosition(posDeleteConfirm.id);
      setPositions((prev) => prev.filter((p) => p.id !== posDeleteConfirm.id));
    } catch {
      setError(uz.common.error);
    } finally {
      setPosDeleteConfirm(null);
    }
  }

  const deptCols: Column<Department>[] = [
    {
      key: 'name',
      header: uz.departments.nameLabel,
      render: (d) => <span className="font-medium text-gray-900">{d.name}</span>,
    },
    {
      key: 'parent',
      header: uz.departments.parentLabel,
      render: (d) => <span className="text-sm text-gray-700">{parentName(d.parentId)}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-40',
      render: (d) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            title={uz.common.edit}
            aria-label={uz.common.edit}
            onClick={() => openDeptForm(d)}
          >
            <Pencil size={15} />
          </Button>
          <Button
            variant="danger"
            size="icon"
            title={uz.departments.delete}
            aria-label={uz.departments.delete}
            onClick={() => setDeptDeleteConfirm(d)}
          >
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ];

  const posCols: Column<Position>[] = [
    {
      key: 'name',
      header: uz.positions.nameLabel,
      render: (p) => <span className="font-medium text-gray-900">{p.name}</span>,
    },
    {
      key: 'department',
      header: uz.positions.departmentLabel,
      render: (p) => <span className="text-sm text-gray-700">{deptLabel(p.departmentId)}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-40',
      render: (p) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            title={uz.common.edit}
            aria-label={uz.common.edit}
            onClick={() => openPosForm(p)}
          >
            <Pencil size={15} />
          </Button>
          <Button
            variant="danger"
            size="icon"
            title={uz.positions.delete}
            aria-label={uz.positions.delete}
            onClick={() => setPosDeleteConfirm(p)}
          >
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={tab === 'departments' ? uz.departments.title : uz.positions.title}
        actions={
          tab === 'departments' ? (
            <Button
              size="icon"
              title={uz.departments.add}
              aria-label={uz.departments.add}
              onClick={() => openDeptForm(null)}
            >
              <Plus size={16} />
            </Button>
          ) : (
            <Button
              size="icon"
              title={uz.positions.add}
              aria-label={uz.positions.add}
              onClick={() => openPosForm(null)}
            >
              <Plus size={16} />
            </Button>
          )
        }
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-2 border-b border-gray-200">
        {(['departments', 'positions'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'px-4 py-2 text-sm font-medium transition-colors',
              tab === t
                ? 'border-b-2 border-blue-600 text-blue-700'
                : 'text-gray-600 hover:text-gray-900',
            ].join(' ')}
          >
            {t === 'departments' ? uz.departments.title : uz.positions.title}
          </button>
        ))}
      </div>

      {tab === 'departments' && (
        <Table
          columns={deptCols}
          data={departments}
          rowKey={(d) => d.id}
          loading={loading}
          error={null}
          emptyText={uz.departments.emptyText}
          onRetry={load}
        />
      )}
      {tab === 'positions' && (
        <Table
          columns={posCols}
          data={positions}
          rowKey={(p) => p.id}
          loading={loading}
          error={null}
          emptyText={uz.positions.emptyText}
          onRetry={load}
        />
      )}

      {/* Department form modal */}
      <Modal
        open={deptForm}
        onClose={() => setDeptForm(false)}
        title={deptEdit ? uz.departments.edit : uz.departments.add}
        footer={
          <>
            <Button
              variant="secondary"
              size="icon"
              title={uz.common.cancel}
              aria-label={uz.common.cancel}
              onClick={() => setDeptForm(false)}
              disabled={deptSaving}
            >
              <X size={16} />
            </Button>
            <Button
              type="submit"
              form="dept-form"
              size="icon"
              title={uz.common.save}
              aria-label={uz.common.save}
              loading={deptSaving}
            >
              <Save size={16} />
            </Button>
          </>
        }
      >
        <form id="dept-form" onSubmit={saveDept} className="space-y-4">
          {deptFormErr && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {deptFormErr}
            </div>
          )}
          <Input
            label={uz.departments.nameLabel}
            placeholder={uz.departments.namePlaceholder}
            value={deptName}
            onChange={(e) => setDeptName(e.target.value)}
            required
          />
          <Select
            label={uz.departments.parentLabel}
            value={deptParent}
            onChange={(e) => setDeptParent(e.target.value)}
          >
            <option value="">{uz.departments.parentNone}</option>
            {departments
              .filter((d) => !deptEdit || d.id !== deptEdit.id)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </Select>
        </form>
      </Modal>

      {/* Delete department confirm */}
      <Modal
        open={deptDeleteConfirm !== null}
        onClose={() => setDeptDeleteConfirm(null)}
        title={uz.departments.delete}
        footer={
          <>
            <Button
              variant="secondary"
              size="icon"
              title={uz.common.cancel}
              aria-label={uz.common.cancel}
              onClick={() => setDeptDeleteConfirm(null)}
            >
              <X size={16} />
            </Button>
            <Button
              variant="danger"
              size="icon"
              title={uz.departments.delete}
              aria-label={uz.departments.delete}
              onClick={deleteDept}
            >
              <Trash2 size={16} />
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700">{uz.departments.deleteConfirm}</p>
      </Modal>

      {/* Position form modal */}
      <Modal
        open={posForm}
        onClose={() => setPosForm(false)}
        title={posEdit ? uz.positions.edit : uz.positions.add}
        footer={
          <>
            <Button
              variant="secondary"
              size="icon"
              title={uz.common.cancel}
              aria-label={uz.common.cancel}
              onClick={() => setPosForm(false)}
              disabled={posSaving}
            >
              <X size={16} />
            </Button>
            <Button
              type="submit"
              form="pos-form"
              size="icon"
              title={uz.common.save}
              aria-label={uz.common.save}
              loading={posSaving}
            >
              <Save size={16} />
            </Button>
          </>
        }
      >
        <form id="pos-form" onSubmit={savePos} className="space-y-4">
          {posFormErr && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {posFormErr}
            </div>
          )}
          <Input
            label={uz.positions.nameLabel}
            placeholder={uz.positions.namePlaceholder}
            value={posName}
            onChange={(e) => setPosName(e.target.value)}
            required
          />
          <Select
            label={uz.positions.departmentLabel}
            value={posDept}
            onChange={(e) => setPosDept(e.target.value)}
          >
            <option value="">{uz.positions.departmentAll}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </form>
      </Modal>

      {/* Delete position confirm */}
      <Modal
        open={posDeleteConfirm !== null}
        onClose={() => setPosDeleteConfirm(null)}
        title={uz.positions.delete}
        footer={
          <>
            <Button
              variant="secondary"
              size="icon"
              title={uz.common.cancel}
              aria-label={uz.common.cancel}
              onClick={() => setPosDeleteConfirm(null)}
            >
              <X size={16} />
            </Button>
            <Button
              variant="danger"
              size="icon"
              title={uz.positions.delete}
              aria-label={uz.positions.delete}
              onClick={deletePos}
            >
              <Trash2 size={16} />
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700">{uz.positions.deleteConfirm}</p>
      </Modal>
    </div>
  );
}
