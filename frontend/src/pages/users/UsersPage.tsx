import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Modal, Select, Table, type Column } from '@/components/ui';
import { uz } from '@/i18n/uz';
import {
  activateUser,
  blockUser,
  createUser,
  getUsers,
  updateUser,
  type CreateUserDto,
  type UserListItem,
  type UserRole,
  type UserStatus,
} from '@/api/users';
import { getDepartments, getPositions, type Department, type Position } from '@/api/departments';
import { UserFormModal } from './UserFormModal';

const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: uz.roles.super_admin,
  admin: uz.roles.admin,
  expert: uz.roles.expert,
  examinee: uz.roles.examinee,
};

const STATUS_BADGE: Record<UserStatus, 'success' | 'danger' | 'neutral'> = {
  active: 'success',
  blocked: 'danger',
  archived: 'neutral',
};

const STATUS_LABEL: Record<UserStatus, string> = {
  active: uz.users.statusActive,
  blocked: uz.users.statusBlocked,
  archived: uz.users.statusArchived,
};

export function UsersPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('');
  const [deptFilter, setDeptFilter] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserListItem | null>(null);
  const [blockConfirm, setBlockConfirm] = useState<UserListItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, deptsData, posData] = await Promise.all([
        getUsers({
          role: roleFilter || undefined,
          status: statusFilter || undefined,
          departmentId: deptFilter || undefined,
        }),
        getDepartments(),
        getPositions(),
      ]);
      setUsers(usersData);
      setDepartments(deptsData);
      setPositions(posData);
    } catch {
      setError(uz.common.error);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter, deptFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  function deptName(id: string | null) {
    if (!id) return uz.users.noDepartment;
    return departments.find((d) => d.id === id)?.name ?? uz.users.noDepartment;
  }

  function posName(id: string | null) {
    if (!id) return uz.users.noPosition;
    return positions.find((p) => p.id === id)?.name ?? uz.users.noPosition;
  }

  async function handleSave(dto: CreateUserDto, id?: string) {
    if (id) {
      const updated = await updateUser(id, dto);
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    } else {
      const created = await createUser(dto);
      setUsers((prev) => [created, ...prev]);
    }
  }

  async function handleBlock(user: UserListItem) {
    setBlockConfirm(null);
    setActionError(null);
    setActionLoading(user.id + ':block');
    try {
      const updated = await blockUser(user.id);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch {
      setActionError(uz.common.error);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleActivate(id: string) {
    setActionError(null);
    setActionLoading(id + ':activate');
    try {
      const updated = await activateUser(id);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch {
      setActionError(uz.common.error);
    } finally {
      setActionLoading(null);
    }
  }

  const columns: Column<UserListItem>[] = [
    {
      key: 'name',
      header: 'F.I.Sh.',
      render: (u) => (
        <div>
          <div className="font-medium text-gray-900">
            {u.lastName} {u.firstName}
            {u.middleName ? ` ${u.middleName}` : ''}
          </div>
          {u.login && <div className="text-xs text-gray-500">{u.login}</div>}
        </div>
      ),
    },
    {
      key: 'role',
      header: uz.users.roleLabel,
      render: (u) => <span className="text-sm text-gray-700">{ROLE_LABEL[u.role]}</span>,
    },
    {
      key: 'department',
      header: uz.users.departmentLabel,
      render: (u) => (
        <div>
          <div className="text-sm text-gray-700">{deptName(u.departmentId)}</div>
          {u.positionId && <div className="text-xs text-gray-500">{posName(u.positionId)}</div>}
        </div>
      ),
    },
    {
      key: 'status',
      header: uz.questions.statusLabel,
      render: (u) => <Badge variant={STATUS_BADGE[u.status]}>{STATUS_LABEL[u.status]}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-44',
      render: (u) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditTarget(u);
              setFormOpen(true);
            }}
          >
            Tahrirlash
          </Button>
          {u.status === 'active' && (
            <Button
              variant="danger"
              size="sm"
              loading={actionLoading === u.id + ':block'}
              onClick={() => setBlockConfirm(u)}
            >
              {uz.users.block}
            </Button>
          )}
          {u.status === 'blocked' && (
            <Button
              variant="secondary"
              size="sm"
              loading={actionLoading === u.id + ':activate'}
              onClick={() => handleActivate(u.id)}
            >
              {uz.users.activateUser}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{uz.users.title}</h1>
        <Button
          size="sm"
          onClick={() => {
            setEditTarget(null);
            setFormOpen(true);
          }}
        >
          {uz.users.add}
        </Button>
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap gap-4">
          <div className="w-44">
            <Select
              label={uz.users.roleLabel}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
            >
              <option value="">{uz.users.allRoles}</option>
              {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-44">
            <Select
              label={uz.questions.statusLabel}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as UserStatus | '')}
            >
              <option value="">{uz.users.allStatuses}</option>
              <option value="active">{uz.users.statusActive}</option>
              <option value="blocked">{uz.users.statusBlocked}</option>
              <option value="archived">{uz.users.statusArchived}</option>
            </Select>
          </div>
          <div className="w-52">
            <Select
              label={uz.users.departmentLabel}
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="">{uz.users.allDepartments}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <Table
        columns={columns}
        data={users}
        rowKey={(u) => u.id}
        loading={loading}
        error={error}
        emptyText={uz.users.emptyText}
        onRetry={load}
      />

      <UserFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        initial={editTarget}
        departments={departments}
        positions={positions}
      />

      <Modal
        open={blockConfirm !== null}
        onClose={() => setBlockConfirm(null)}
        title={uz.users.block}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setBlockConfirm(null)}>
              {uz.common.cancel}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => blockConfirm && handleBlock(blockConfirm)}
            >
              {uz.users.block}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700">{uz.users.blockConfirm}</p>
      </Modal>
    </div>
  );
}
