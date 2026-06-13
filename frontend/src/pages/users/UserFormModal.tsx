import { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';
import { Button, Input, Modal, Select } from '@/components/ui';
import { uz } from '@/i18n/uz';
import { type CreateUserDto, type UserListItem, type UserRole } from '@/api/users';
import { type Department, type Position } from '@/api/departments';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'super_admin', label: uz.roles.super_admin },
  { value: 'admin', label: uz.roles.admin },
  { value: 'expert', label: uz.roles.expert },
  { value: 'examinee', label: uz.roles.examinee },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (dto: CreateUserDto, id?: string) => Promise<void>;
  initial: UserListItem | null;
  departments: Department[];
  positions: Position[];
}

export function UserFormModal({ open, onClose, onSave, initial, departments, positions }: Props) {
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('examinee');
  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [isCandidate, setIsCandidate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setLastName(initial.lastName);
      setFirstName(initial.firstName);
      setMiddleName(initial.middleName ?? '');
      setLogin(initial.login ?? '');
      setPassword('');
      setPhone(initial.phone ?? '');
      setEmail(initial.email ?? '');
      setRole(initial.role);
      setDepartmentId(initial.departmentId ?? '');
      setPositionId(initial.positionId ?? '');
      setIsCandidate(initial.isCandidate);
    } else {
      setLastName('');
      setFirstName('');
      setMiddleName('');
      setLogin('');
      setPassword('');
      setPhone('');
      setEmail('');
      setRole('examinee');
      setDepartmentId('');
      setPositionId('');
      setIsCandidate(false);
    }
    setError(null);
  }, [open, initial]);

  const filteredPositions = departmentId
    ? positions.filter((p) => p.departmentId === departmentId || !p.departmentId)
    : positions;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lastName.trim() || !firstName.trim()) {
      setError('Familiya va ism majburiy');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const dto: CreateUserDto = {
        lastName: lastName.trim(),
        firstName: firstName.trim(),
        middleName: middleName.trim() || undefined,
        login: login.trim() || undefined,
        password: password.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        role,
        departmentId: departmentId || undefined,
        positionId: positionId || undefined,
        isCandidate,
      };
      await onSave(dto, initial?.id);
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? ((err as { response?: { data?: { message?: string } } }).response?.data?.message ??
            err.message)
          : uz.common.error;
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? uz.users.edit : uz.users.add}
      className="max-w-xl"
      footer={
        <>
          <Button
            variant="secondary"
            size="icon"
            title={uz.common.cancel}
            aria-label={uz.common.cancel}
            onClick={onClose}
            disabled={saving}
          >
            <X size={16} />
          </Button>
          <Button
            type="submit"
            form="user-form"
            size="icon"
            title={uz.common.save}
            aria-label={uz.common.save}
            loading={saving}
          >
            <Save size={16} />
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={uz.users.lastNameLabel}
            placeholder={uz.users.lastNamePlaceholder}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
          <Input
            label={uz.users.firstNameLabel}
            placeholder={uz.users.firstNamePlaceholder}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>

        <Input
          label={uz.users.middleNameLabel}
          placeholder={uz.users.middleNamePlaceholder}
          value={middleName}
          onChange={(e) => setMiddleName(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={uz.users.loginLabel}
            placeholder={uz.users.loginPlaceholder}
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          />
          <Input
            label={uz.users.passwordLabel}
            type="password"
            placeholder={uz.users.passwordPlaceholder}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint={initial ? uz.users.passwordHint : undefined}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={uz.users.phoneLabel}
            placeholder={uz.users.phonePlaceholder}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label={uz.users.emailLabel}
            type="email"
            placeholder={uz.users.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <Select
          label={uz.users.roleLabel}
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label={uz.users.departmentLabel}
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              setPositionId('');
            }}
          >
            <option value="">{uz.users.noDepartment}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <Select
            label={uz.users.positionLabel}
            value={positionId}
            onChange={(e) => setPositionId(e.target.value)}
          >
            <option value="">{uz.users.noPosition}</option>
            {filteredPositions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isCandidate}
            onChange={(e) => setIsCandidate(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          {uz.users.isCandidateLabel}
        </label>
      </form>
    </Modal>
  );
}
